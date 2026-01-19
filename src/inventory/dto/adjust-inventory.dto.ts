import { IsInt, IsOptional, IsString, IsEnum } from 'class-validator';
import { InventoryTransactionType } from '../entities/inventory-transaction.entity';

export class AdjustInventoryDto {
  @IsInt()
  quantity!: number;

  @IsOptional()
  @IsEnum(InventoryTransactionType)
  type?: InventoryTransactionType;

  @IsOptional()
  @IsString()
  reference?: string;
}
