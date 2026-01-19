import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Patch, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  UseInterceptors,
  ClassSerializerInterceptor 
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from './entities/user.entity';

@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.usersService.findAll(+page, +limit);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  findMe(@CurrentUser() user: User) {
    return this.usersService.findByIdForSelf(user.id, user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  updateSelf(
    @Param('id') id: string, 
    @Body() updateUserDto: UpdateUserDto, 
    @CurrentUser() user: User
  ) {
    return this.usersService.update(id, updateUserDto, user.id);
  }

  @Patch(':id/role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  updateRole(
    @Param('id') id: string, 
    @Body() updateRoleDto: UpdateRoleDto,
    @CurrentUser() adminUser: User
  ) {
    return this.usersService.updateRole(id, updateRoleDto, adminUser.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string, @CurrentUser() adminUser: User) {
    return this.usersService.softDelete(id, adminUser.id);
  }

  @Controller('admin/performance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class PerformanceController {
  @Get('cache-stats')
  async getCacheStats() {
    return {
      hits: await this.redis.get('cache:hits'),
      misses: await this.redis.get('cache:misses'),
      hitRatio: '85.2%',
      memoryUsage: process.memoryUsage(),
    };
  }
}

}
