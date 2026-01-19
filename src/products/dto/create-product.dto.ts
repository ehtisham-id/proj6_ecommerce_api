import { IsString, IsNumber, IsPositive, IsUUID, IsEnum, IsOptional, Length, Min, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus } from '../entities/product.entity';

export class CreateProductDto {
  @IsString()
  @Length(3, 200)
  name!: string;

  @IsString()
  description!: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  price!: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  stockQuantity!: number;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsUUID()
  categoryId!: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
