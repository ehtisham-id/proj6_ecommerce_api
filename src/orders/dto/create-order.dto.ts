import { IsUUID, IsInt, IsPositive, IsDecimal, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { IsUUIDArray } from '@common/decorators/is-uuid-array.decorator';

class OrderItemDto {
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
  @IsUUIDArray(item => item.productId)
  items!: OrderItemDto[];

  @IsDecimal()
  @Min(0)
  @Type(() => Number)
  shippingAmount?: number;

  @IsDecimal()
  @Min(0)
  @Type(() => Number)
  taxAmount?: number;
}
