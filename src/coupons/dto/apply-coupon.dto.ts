import { IsString, Length, IsDecimal, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ApplyCouponDto {
  @IsString()
  @Length(4, 20)
  code: string;

  @IsDecimal()
  @Min(0)
  @Type(() => Number)
  orderAmount: number;
}
