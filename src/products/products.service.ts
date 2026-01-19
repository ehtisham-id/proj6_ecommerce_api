import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual, Like } from 'typeorm';

import { Product, ProductStatus } from './entities/product.entity';
import { Category } from '../categories/entities/category.entity';
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

    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,

    @InjectRepository(ProductImage)
    private readonly imageRepository: Repository<ProductImage>,

    private readonly categoriesService: CategoriesService,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    sellerId: string,
  ): Promise<Product> {
    await this.categoriesService.findOne(createProductDto.categoryId);

    const product = this.productRepository.create({
      ...createProductDto,
      sellerId,
    });

    return this.productRepository.save(product);
  }

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

    const where: any = {
      isActive: true,
      deletedAt: null,
      status: ProductStatus.PUBLISHED,
    };

    if (search) {
      where.name = Like(`%${search}%`);
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (status) {
      where.status = status;
    }

    if (minPrice) {
      where.price = MoreThanOrEqual(minPrice);
    }

    if (maxPrice) {
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

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id, isActive: true, deletedAt: null },
      relations: ['seller', 'category', 'images'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    sellerId: string,
  ): Promise<Product> {
    const product = await this.findOne(id);

    if (product.sellerId !== sellerId && sellerId !== 'ADMIN') {
      throw new BadRequestException('Can only update own products');
    }

    Object.assign(product, updateProductDto);
    return this.productRepository.save(product);
  }

  async remove(id: string, sellerId: string): Promise<void> {
    const product = await this.findOne(id);

    if (product.sellerId !== sellerId && sellerId !== 'ADMIN') {
      throw new BadRequestException('Can only delete own products');
    }

    await this.productRepository.softDelete(id);
  }

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
      (await this.imageRepository.count({ where: { productId } })) + 1;

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
