import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';

import { UsersService } from './users.service';
import { User } from './entities/user.entity';

//import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
  controllers: [UsersController],
  exports: [UsersService],
  providers: [UsersService],
  //imports: [TypeOrmModule.forFeature([User])],
})
export class UsersModule {}
