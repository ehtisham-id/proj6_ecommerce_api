import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuditLoggerService } from '@common/audit/audit-logger.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService, AuditLoggerService],
  controllers: [UsersController],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
