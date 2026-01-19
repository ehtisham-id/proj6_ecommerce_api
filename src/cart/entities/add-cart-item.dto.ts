import { IsUUID, IsInt, Min, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class AddCartItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}
