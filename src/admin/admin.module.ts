import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuditLog } from './entities/audit-log.entity';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog]),
    OrdersModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
