import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Review, ReviewStatus } from './entities/review.entity';
import { ReviewModeration } from './entities/review-moderation.entity';
import { CreateReviewDto, ReviewQueryDto } from './dto';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
    @InjectRepository(ReviewModeration)
    private moderationRepository: Repository<ReviewModeration>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private productsService: ProductsService,
    private ordersService: OrdersService,
  ) {}

  async create(userId: string, dto: CreateReviewDto): Promise<Review> {
    // Verify user purchased product
    const hasPurchased = await this.verifyPurchase(userId, dto.productId);
    if (!hasPurchased) {
      throw new BadRequestException('Must purchase product to review');
    }

    // Check if user already reviewed this product
    const existingReview = await this.reviewRepository.findOne({
      where: { productId: dto.productId, userId, status: In([ReviewStatus.APPROVED, ReviewStatus.PENDING]) }
    });

    if (existingReview) {
      throw new ConflictException('User can only submit one review per product');
    }

    const product = await this.productsService.findOne(dto.productId);
    const user = await this.userRepository.findOne({ where: { id: userId } });

    const review = this.reviewRepository.create({
      ...dto,
      productId: dto.productId,
      userId,
      product,
      user,
      status: ReviewStatus.PENDING, // Auto-moderation in production
    });

    const savedReview = await this.reviewRepository.save(review);
    
    // Update product rating cache (async)
    this.updateProductRating(product.id).catch(console.error);
    
    return savedReview;
  }

  async findAll(query: ReviewQueryDto): Promise<{
    reviews: Review[];
    total: number;
    avgRating?: number;
    page: number;
    limit: number;
  }> {
    const { productId, page = 1, limit = 20, status, rating } = query;

    const where: any = { 
      status: ReviewStatus.APPROVED,
      deletedAt: null 
    };

    if (productId) {
      where.productId = productId;
    }

    if (status) {
      where.status = status;
    }

    if (rating) {
      where.rating = rating;
    }

    const [reviews, total] = await this.reviewRepository.findAndCount({
      where,
      relations: ['user', 'product'],
      order: { createdAt: 'DESC', isHelpful: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const avgRating = await this.getProductAvgRating(productId);

    return { reviews, total, avgRating, page: +page, limit: +limit };
  }

  async findProductReviews(productId: string, query: ReviewQueryDto): Promise<{
    reviews: Review[];
    total: number;
    avgRating: number;
    ratingDistribution: Record<number, number>;
  }> {
    const where: any = { 
      productId, 
      status: ReviewStatus.APPROVED,
      deletedAt: null 
    };

    const [reviews, total] = await this.reviewRepository.findAndCount({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC', isHelpful: 'DESC' },
      skip: (query.page! - 1) * query.limit!,
      take: query.limit!,
    });

    const avgRating = await this.getProductAvgRating(productId);
    const ratingDistribution = await this.getRatingDistribution(productId);

    return { reviews, total, avgRating, ratingDistribution };
  }

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

  async approveReview(reviewId: string, moderatorId: string, reason?: string): Promise<Review> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId, status: ReviewStatus.PENDING },
      relations: ['product'],
    });

    if (!review) {
      throw new NotFoundException('Pending review not found');
    }

    review.status = ReviewStatus.APPROVED;
    const approvedReview = await this.reviewRepository.save(review);

    // Record moderation action
    const moderation = this.moderationRepository.create({
      reviewId,
      moderatorId,
      action: 'APPROVED',
      reason,
    });
    await this.moderationRepository.save(moderation);

    // Update product ratings
    await this.updateProductRating(review.productId);

    return approvedReview;
  }

  private async verifyPurchase(userId: string, productId: string): Promise<boolean> {
    const orderCount = await this.ordersService.orderRepository.count({
      where: {
        userId,
        status: In(['PAID', 'COMPLETED']),
        items: { productId }
      },
      relations: ['items']
    });
    return orderCount > 0;
  }

  private async getProductAvgRating(productId?: string): Promise<number> {
    if (!productId) return 0;
    
    const result = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'avgRating')
      .where('review.productId = :productId', { productId })
      .andWhere('review.status = :status', { status: ReviewStatus.APPROVED })
      .getRawOne();
    
    return parseFloat(result.avgRating || '0');
  }

  private async getRatingDistribution(productId: string): Promise<Record<number, number>> {
    const result = await this.reviewRepository
      .createQueryBuilder('review')
      .select('review.rating', 'rating')
      .addSelect('COUNT(*)', 'count')
      .where('review.productId = :productId', { productId })
      .andWhere('review.status = :status', { status: ReviewStatus.APPROVED })
      .groupBy('review.rating')
      .getRawMany();

    return result.reduce((acc, row) => {
      acc[parseInt(row.rating)] = parseInt(row.count);
      return acc;
    }, {} as Record<number, number>);
  }

  private async updateProductRating(productId: string): Promise<void> {
    // Update product entity with latest avg rating (cached)
    const avgRating = await this.getProductAvgRating(productId);
    
    // In production: Update product metadata with rating info
    console.log(`Product ${productId} rating updated to ${avgRating}`);
  }
}
