import { IsEnum, IsString } from 'class-validator';
import { OrderStatus } from '@common/enums/order-status.enum';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus = OrderStatus.PENDING;

  @IsString()
  reason?: string;
}
