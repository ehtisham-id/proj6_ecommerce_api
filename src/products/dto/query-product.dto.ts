import { IsOptional, IsString, IsNumber, IsPositive, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus } from '../entities/product.entity';

export class QueryProductDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxPrice?: number;

  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: 'name' | 'price' | 'createdAt' | 'soldQuantity';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
