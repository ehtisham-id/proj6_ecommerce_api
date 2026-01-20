import {
  IsUUID,
  IsInt,
  IsPositive,
  IsDecimal,
  Min,
  ValidateNested,
  IsOptional,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsUUID()
  productId!: string;

  @IsInt()
  @IsPositive()
  @Type(() => Number)
  quantity!: number;
}

export class CreateOrderDto {
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @ArrayMinSize(1)
  items!: OrderItemDto[];

  @IsOptional()
  @IsDecimal()
  @Min(0)
  @Type(() => Number)
  shippingAmount?: number;

  @IsOptional()
  @IsDecimal()
  @Min(0)
  @Type(() => Number)
  taxAmount?: number;
}
