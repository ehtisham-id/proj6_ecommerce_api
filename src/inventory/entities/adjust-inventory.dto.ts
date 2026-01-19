import { IsUUID, IsNumber, IsInt, Min, IsEnum, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { InventoryTransactionType } from '../entities/inventory-transaction.entity';

export class AdjustInventoryDto {
  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(-999999)
  @Type(() => Number)
  quantity!: number;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsEnum(InventoryTransactionType)
  type?: InventoryTransactionType;
}
