import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { OrdersModule } from '../orders/orders.module';
import { RedisModule } from '@common/redis/redis.module';
import { IdempotencyService } from '@common/utils/idempotency.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]),
    OrdersModule,
    RedisModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, IdempotencyService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
