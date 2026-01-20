import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuditLog } from './entities/audit-log.entity';
import { OrdersModule } from '../orders/orders.module';
import { UsersModule } from 'src/users/users.module';
import { ProductsModule } from 'src/products/products.module';
import { CacheModule } from 'src/cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog]),
    OrdersModule,
    UsersModule,
    ProductsModule,
    CacheModule
  ],
  controllers: [AdminController],
  providers: [AdminService, TypeOrmModule],
})
export class AdminModule {}
