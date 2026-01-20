import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';

import { Review, ReviewStatus } from './entities/review.entity';
import { ReviewModeration } from './entities/review-moderation.entity';

import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';

import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,

    @InjectRepository(ReviewModeration)
    private readonly moderationRepository: Repository<ReviewModeration>,

    private readonly productsService: ProductsService,
    private readonly ordersService: OrdersService,
  ) {}

  /* ===================== CREATE ===================== */

  async create(userId: string, dto: CreateReviewDto): Promise<Review> {
    const hasPurchased = await this.verifyPurchase(userId, dto.productId);
    if (!hasPurchased) {
      throw new BadRequestException('Must purchase product to review');
    }

    const existingReview = await this.reviewRepository.findOne({
      where: {
        productId: dto.productId,
        userId,
        status: In([ReviewStatus.PENDING, ReviewStatus.APPROVED]),
      },
    });

    if (existingReview) {
      throw new ConflictException(
        'User can only submit one review per product',
      );
    }

    // ensure product exists
    await this.productsService.findOne(dto.productId);

    const review = this.reviewRepository.create({
      productId: dto.productId,
      userId,
      rating: dto.rating,
      comment: dto.comment,
      status: ReviewStatus.PENDING,
    });

    const savedReview = await this.reviewRepository.save(review);

    this.updateProductRating(dto.productId).catch(console.error);

    return savedReview;
  }

  /* ===================== FIND ===================== */

  async findAll(query: ReviewQueryDto) {
    const { productId, page = 1, limit = 20, status, rating } = query;

    const where: any = {
      deletedAt: IsNull(),
      status: status ?? ReviewStatus.APPROVED,
    };

    if (productId) where.productId = productId;
    if (rating) where.rating = rating;

    const [reviews, total] = await this.reviewRepository.findAndCount({
      where,
      relations: ['user', 'product'],
      order: {
        isHelpful: 'DESC',
        createdAt: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const avgRating = productId ? await this.getProductAvgRating(productId) : 0;

    return {
      reviews,
      total,
      avgRating,
      page: Number(page),
      limit: Number(limit),
    };
  }

  async findProductReviews(productId: string, query: ReviewQueryDto) {
    const { page = 1, limit = 20 } = query;

    const [reviews, total] = await this.reviewRepository.findAndCount({
      where: {
        productId,
        status: ReviewStatus.APPROVED,
        deletedAt: IsNull(),
      },
      relations: ['user'],
      order: {
        isHelpful: 'DESC',
        createdAt: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const avgRating = await this.getProductAvgRating(productId);
    const ratingDistribution = await this.getRatingDistribution(productId);

    return {
      reviews,
      total,
      avgRating,
      ratingDistribution,
    };
  }

  /* ===================== DELETE ===================== */

  async delete(id: string, userId: string): Promise<void> {
    const review = await this.reviewRepository.findOne({
      where: { id, userId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    await this.reviewRepository.softDelete(id);
    await this.updateProductRating(review.productId);
  }

  /* ===================== MODERATION ===================== */

  async approveReview(
    reviewId: string,
    moderatorId: string,
    reason?: string,
  ): Promise<Review> {
    const review = await this.reviewRepository.findOne({
      where: {
        id: reviewId,
        status: ReviewStatus.PENDING,
      },
    });

    if (!review) {
      throw new NotFoundException('Pending review not found');
    }

    review.status = ReviewStatus.APPROVED;
    const approvedReview = await this.reviewRepository.save(review);

    const moderation = this.moderationRepository.create({
      reviewId,
      moderatorId,
      action: 'APPROVED',
      reason,
    });

    await this.moderationRepository.save(moderation);
    await this.updateProductRating(review.productId);

    return approvedReview;
  }

  /* ===================== HELPERS ===================== */

  private async verifyPurchase(
    userId: string,
    productId: string,
  ): Promise<boolean> {
    const orders = await this.ordersService.findAll(userId, 1, 50);

    return orders.orders.some((order: any) =>
      order.items.some((item: any) => item.productId === productId),
    );
  }

  private async getProductAvgRating(productId: string): Promise<number> {
    const result = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'avgRating')
      .where('review.productId = :productId', { productId })
      .andWhere('review.status = :status', {
        status: ReviewStatus.APPROVED,
      })
      .getRawOne();

    return parseFloat(result?.avgRating ?? '0');
  }

  private async getRatingDistribution(
    productId: string,
  ): Promise<Record<number, number>> {
    const result = await this.reviewRepository
      .createQueryBuilder('review')
      .select('review.rating', 'rating')
      .addSelect('COUNT(*)', 'count')
      .where('review.productId = :productId', { productId })
      .andWhere('review.status = :status', {
        status: ReviewStatus.APPROVED,
      })
      .groupBy('review.rating')
      .getRawMany();

    return result.reduce(
      (acc, row) => {
        acc[Number(row.rating)] = Number(row.count);
        return acc;
      },
      {} as Record<number, number>,
    );
  }

  private async updateProductRating(productId: string): Promise<void> {
    const avgRating = await this.getProductAvgRating(productId);
    console.log(`Product ${productId} rating updated to ${avgRating}`);
  }
}
