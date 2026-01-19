import { IsUUID, IsInt, Min, IsPositive, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCartItemDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @IsOptional()
  @IsUUID()
  productId?: string; // For bulk updates
}
