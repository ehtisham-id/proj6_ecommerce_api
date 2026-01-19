import { IsString, IsUUID, IsOptional } from 'class-validator';

export class ConfirmPaymentDto {
  @IsString()
  paymentIntentId: string = "";

  @IsUUID()
  @IsOptional()
  orderId?: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}
