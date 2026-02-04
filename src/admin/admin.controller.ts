import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { OrdersService } from '../orders/orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AnalyticsFilterDto } from './dto/analytics-filter.dto';
import { RevenueReport } from './interfaces/revenue-report.dto';
import { DashboardStats } from './interfaces/dashboard-stats.dto';
import { Role } from '@common/types/role.type';
import { Cacheable } from '../common/decorators/cacheable.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly ordersService: OrdersService,
  ) {}

  @Get('stats')
  @Cacheable({ ttl: 60 })
  getDashboardStats(): Promise<DashboardStats> {
    return this.adminService.getDashboardStats();
  }

  @Get('revenue')
  getRevenueReport(
    @Query() filter: AnalyticsFilterDto,
  ): Promise<RevenueReport[]> {
    return this.adminService.getRevenueReport(filter);
  }

  @Get('top-products')
  @Cacheable({ ttl: 300 })
  getTopProducts(@Query('days') days = 30): Promise<any[]> {
    return this.adminService.getTopProducts(+days);
  }

  @Get('orders')
  async getOrders(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.ordersService.findAllAdmin(Number(page), Number(limit));
  }
}
