import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Product, ProductStatus } from './entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { CreateProductDto, UpdateProductDto, QueryProductDto } from './dto';
import { CategoriesService } from '../categories/categories.service';
import { ProductImage } from './entities/product-image.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(ProductImage)
    private imageRepository: Repository<ProductImage>,
    private categoriesService: CategoriesService,
  ) {}

  async create(createProductDto: CreateProductDto, sellerId: string): Promise<Product> {
    // Validate category exists
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
    const { page = 1, limit = 20, search, categoryId, status, minPrice, maxPrice, sortBy = 'createdAt', sortOrder = 'DESC' } = query;

    const where: any = { isActive: true, deletedAt: null, status: ProductStatus.PUBLISHED };
    
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

    return { products, total, page: +page, limit: +limit };
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

  async update(id: string, updateProductDto: UpdateProductDto, sellerId: string): Promise<Product> {
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

  async addImage(productId: string, imageUrl: string, sellerId: string): Promise<ProductImage> {
    const product = await this.findOne(productId);
    
    if (product.sellerId !== sellerId) {
      throw new BadRequestException('Can only add images to own products');
    }

    const image = this.imageRepository.create({
      url: imageUrl,
      productId,
      sortOrder: (await this.imageRepository.count({ where: { productId } })) + 1,
    });

    return this.imageRepository.save(image);
  }

  async removeImage(productId: string, imageId: string, sellerId: string): Promise<void> {
    const product = await this.findOne(productId);
    
    if (product.sellerId !== sellerId) {
      throw new BadRequestException('Can only remove images from own products');
    }

    await this.imageRepository.softDelete({ id: imageId, productId });
  }
}


// src/modules/products/products.service.ts
import { CacheService } from '@common/cache/cache.service';

@Injectable()
export class ProductsService {
  constructor(
    // ... existing deps
    private cacheService: CacheService,
  ) {}

  @Cacheable({ ttl: 600, keyPrefix: 'products' })
  async findAll(query: QueryProductDto) {
    // Cache entire paginated result
    const cacheKey = `products:all:${JSON.stringify(query)}`;
    
    return this.cacheService.getOrSet(cacheKey, async () => {
      // Original database query
      const [products, total] = await this.productRepository.findAndCount({
        // ... query logic
      });
      return { products, total, page: query.page, limit: query.limit };
    });
  }

  async findOne(id: string) {
    return this.cacheService.getOrSet(
      `product:${id}`,
      () => this.productRepository.findOne({ where: { id }, relations: ['seller', 'category'] }),
      { ttl: 1800, compress: true } // 30 min, compressed
    );
  }

  async invalidateProductCache(productId: string) {
    await Promise.all([
      this.cacheService.invalidate(`product:${productId}`),
      this.cacheService.invalidate('products:all:*'),
      this.cacheService.invalidate(`product:${productId}:reviews:*`),
    ]);
  }
}
