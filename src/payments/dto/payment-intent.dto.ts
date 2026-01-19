import { IsUUID, IsDecimal, Min, IsString, IsOptional, Length } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaymentIntentDto {
  @IsUUID()
  orderId!: string;

  @IsDecimal()
  @Min(0.01)
  @Type(() => Number)
  amount!: number;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  paymentMethodId?: string;
}
