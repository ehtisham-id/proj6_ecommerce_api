import { 
  Controller, 
  Post, 
  Get, 
  Patch, 
  Param, 
  Body, 
  Query, 
  UseGuards, 
  ParseUUIDPipe 
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createOrderDto: CreateOrderDto, @CurrentUser() user: any) {
    return this.ordersService.createOrder(user.id, createOrderDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.findAll(user.id, +page, +limit);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.ordersService.findOne(id, user.id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SELLER')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.updateStatus(id, updateOrderStatusDto, user.id);
  }
}
