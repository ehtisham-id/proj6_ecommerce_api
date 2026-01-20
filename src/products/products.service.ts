import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  FindOptionsWhere,
  Like,
  IsNull,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
} from 'typeorm';

import { Product, ProductStatus } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { CategoriesService } from '../categories/categories.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(ProductImage)
    private readonly imageRepository: Repository<ProductImage>,

    private readonly categoriesService: CategoriesService,
  ) {}

  /* ===================== CREATE ===================== */

  async create(dto: CreateProductDto, sellerId: string): Promise<Product> {
    await this.categoriesService.findOne(dto.categoryId);

    const product = this.productRepository.create({
      ...dto,
      sellerId,
    });

    return this.productRepository.save(product);
  }

  /* ===================== FIND ALL ===================== */

  async findAll(query: QueryProductDto): Promise<{
    products: Product[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 20,
      search,
      categoryId,
      status,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const where: FindOptionsWhere<Product> = {
      isActive: true,
      deletedAt: IsNull(),
      status: status ?? ProductStatus.PUBLISHED,
    };

    if (search) {
      where.name = Like(`%${search}%`);
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (minPrice !== undefined && maxPrice !== undefined) {
      where.price = Between(minPrice, maxPrice);
    } else if (minPrice !== undefined) {
      where.price = MoreThanOrEqual(minPrice);
    } else if (maxPrice !== undefined) {
      where.price = LessThanOrEqual(maxPrice);
    }

    const [products, total] = await this.productRepository.findAndCount({
      where,
      relations: ['seller', 'category', 'images'],
      order: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      products,
      total,
      page: Number(page),
      limit: Number(limit),
    };
  }

  /* ===================== FIND ONE ===================== */

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: {
        id,
        isActive: true,
        deletedAt: IsNull(),
      },
      relations: ['seller', 'category', 'images'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  /* ===================== UPDATE ===================== */

  async update(
    id: string,
    dto: UpdateProductDto,
    sellerId: string,
  ): Promise<Product> {
    const product = await this.findOne(id);

    if (product.sellerId !== sellerId && sellerId !== 'ADMIN') {
      throw new BadRequestException('Can only update own products');
    }

    if (dto.categoryId) {
      await this.categoriesService.findOne(dto.categoryId);
    }

    Object.assign(product, dto);
    return this.productRepository.save(product);
  }

  /* ===================== DELETE ===================== */

  async remove(id: string, sellerId: string): Promise<void> {
    const product = await this.findOne(id);

    if (product.sellerId !== sellerId && sellerId !== 'ADMIN') {
      throw new BadRequestException('Can only delete own products');
    }

    await this.productRepository.softDelete(id);
  }

  /* ===================== IMAGES ===================== */

  async addImage(
    productId: string,
    imageUrl: string,
    sellerId: string,
  ): Promise<ProductImage> {
    const product = await this.findOne(productId);

    if (product.sellerId !== sellerId) {
      throw new BadRequestException('Can only add images to own products');
    }

    const sortOrder =
      (await this.imageRepository.count({
        where: { productId },
      })) + 1;

    const image = this.imageRepository.create({
      url: imageUrl,
      productId,
      sortOrder,
    });

    return this.imageRepository.save(image);
  }

  async removeImage(
    productId: string,
    imageId: string,
    sellerId: string,
  ): Promise<void> {
    const product = await this.findOne(productId);

    if (product.sellerId !== sellerId) {
      throw new BadRequestException('Can only remove images from own products');
    }

    await this.imageRepository.softDelete({
      id: imageId,
      productId,
    });
  }
}
