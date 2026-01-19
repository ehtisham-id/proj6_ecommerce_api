import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nestjs-winston';
import { ConfigConfigFactory } from '@config/config.factory';
import { LoggingModule } from '@common/logging/logging.module';
import { DatabaseModule } from '@database/database.module';


import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './users/users.module';
import { Product } from './products/entities/product.entity';
import { InventoryModule } from './inventory/inventory.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ReviewsModule } from './reviews/reviews.module';
import { CouponsModule } from './coupons/coupons.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [ConfigConfigFactory],
    }),
    ThrottlerModule.forRoot(async ({ config }) => [
      {
        ttl: config.get('THROTTLE_TTL'),
        limit: config.get('THROTTLE_LIMIT'),
      },
    ]),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        level: configService.get('NODE_ENV') === 'production' ? 'info' : 'debug',
        // Production logging config
      }),
    }),
    LoggingModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule, InventoryModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    ReviewsModule,
    CouponsModule,
    AdminModule
  ],
})
export class AppModule {}
