import { IsString, Length, IsEnum, IsInt, Min, IsPositive, IsDateString, IsBoolean, IsDecimal, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { DiscountType } from '@common/enums/discount-type.enum';

export class CreateCouponDto {
  @IsString()
  @Length(4, 20)
  code: string;

  @IsDecimal()
  @IsPositive()
  @Type(() => Number)
  discountValue: number;

  @IsEnum(DiscountType)
  discountType: DiscountType;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxUses: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxUsesPerUser: number;

  @IsDateString()
  expiresAt: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsDecimal()
  @Type(() => Number)
  minOrderAmount?: number;
}
