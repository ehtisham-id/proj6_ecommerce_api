import { 
  Controller, 
  Get, 
  Query, 
  UseGuards, 
  Put,
  Post,
  Body
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AnalyticsFilterDto } from './dto/analytics-filter.dto';
import { ExportDto } from './dto/export.dto';
import { Cacheable } from '../common/decorators/cacheable.decorator';
import { RevenueReport } from './interfaces/revenue-report.dto';
import { DashboardStats } from './interfaces/dashboard-stats.dto';
import { Role } from '@common/types/role.type';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @Cacheable({ ttl: 60 })
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('revenue')
  getRevenueReport(@Query() filter: AnalyticsFilterDto): RevenueReport[] {
    return this.adminService.getRevenueReport(filter);
  }

  @Get('top-products')
  @Cacheable({ ttl: 300 })
  getTopProducts(@Query('days') days = 30) {
    return this.adminService.getTopProducts(+days);
  }

  @Get('orders')
  getAdminOrders(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('status') status?: string,
  ) {
    // Admin view of all orders with advanced filtering
  }

  @Get('users')
  getAdminUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('role') role?: string,
  ) {
    // Admin user management overview
  }

  @Get('products')
  getAdminProducts(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('sellerId') sellerId?: string,
  ) {
    // Product moderation dashboard
  }

  @Post('export')
  exportData(@Body() exportDto: ExportDto) {
    // Generate CSV/Excel exports
  }
}