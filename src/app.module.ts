import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ConfigConfigFactory } from './config/config.config.factory';

import { ThrottlerModule } from '@nestjs/throttler';
import { config } from 'process';
import { AuthModule } from './auth/auth.module';
import { DatabaseService } from './database/database.service';
import { RedisService } from './redis/redis.service';
import { UsersService } from './users/users.service';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { InventoryModule } from './inventory/inventory.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ReviewsModule } from './reviews/reviews.module';
import { CouponsModule } from './coupons/coupons.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CacheModule } from './cache/cache.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [ConfigConfigFactory],
    }),
    ThrottlerModule.forRoot({
      ttl: config.get<Number>('THROTTLE_TTL') || 60,
      limit: config.get<Number>('THROTTLE_LIMIT') || 100,
    }),
    AuthModule,
    UsersModule,
    ProductsModule,
    InventoryModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    ReviewsModule,
    CouponsModule,
    NotificationsModule,
    CacheModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService, DatabaseService, RedisService, UsersService],
})
export class AppModule {}
