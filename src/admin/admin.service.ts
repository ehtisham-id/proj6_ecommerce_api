import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { CacheService } from '../cache/cache.service';
import { AnalyticsFilterDto } from './dto/analytics-filter.dto';
import { RevenueReport } from './interfaces/revenue-report.dto';
import { DashboardStats } from './interfaces/dashboard-stats.dto';
import { Role } from '@common/types/role.type';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    private readonly cacheService: CacheService,
  ) {}

  /** DASHBOARD STATS */
  async getDashboardStats(): Promise<DashboardStats> {
    const cacheKey = 'admin:dashboard:stats';
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Raw queries for totals
        const totalRevenueResult = await this.orderRepository
          .createQueryBuilder('order')
          .select('SUM(order.totalAmount)', 'totalRevenue')
          .where('order.status = :status', { status: 'COMPLETED' })
          .getRawOne<{ totalRevenue: string }>();

        const avgOrderValueResult = await this.orderRepository
          .createQueryBuilder('order')
          .select('AVG(order.totalAmount)', 'avgOrderValue')
          .where('order.status = :status', { status: 'COMPLETED' })
          .getRawOne<{ avgOrderValue: string }>();

        const totalOrders = await this.orderRepository.count({
          where: { status: In(['PAID', 'COMPLETED']) },
        });

        const totalUsers = await this.userRepository.count();
        const totalProducts = await this.productRepository.count({
          where: { status: 'PUBLISHED' as any }, // cast to ProductStatus
        });
        const activeSellers = await this.userRepository.count({
          where: { role: Role.SELLER, isActive: true },
        });

        const conversionRate = await this.calculateConversionRate();

        return {
          totalRevenue: parseFloat(totalRevenueResult?.totalRevenue || '0'),
          totalOrders,
          totalUsers,
          totalProducts,
          avgOrderValue: parseFloat(avgOrderValueResult?.avgOrderValue || '0'),
          conversionRate: parseFloat(conversionRate),
          activeSellers,
        };
      },
      { ttl: 60 },
    );
  }

  /** REVENUE REPORT */
  async getRevenueReport(filter: AnalyticsFilterDto): Promise<RevenueReport[]> {
    const cacheKey = `admin:revenue:${JSON.stringify(filter)}`;
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const startDate = filter.startDate
          ? new Date(filter.startDate)
          : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = filter.endDate ? new Date(filter.endDate) : new Date();

        const rawResult = await this.orderRepository
          .createQueryBuilder('order')
          .select("DATE_TRUNC('day', order.createdAt)", 'date')
          .addSelect('SUM(order.totalAmount)', 'revenue')
          .addSelect('COUNT(order.id)', 'orders')
          .where('order.status = :status', { status: 'COMPLETED' })
          .andWhere('order.createdAt BETWEEN :start AND :end', {
            start: startDate,
            end: endDate,
          })
          .groupBy("DATE_TRUNC('day', order.createdAt)")
          .orderBy("DATE_TRUNC('day', order.createdAt)", 'DESC')
          .getRawMany<{ date: string; revenue: string; orders: string }>();

        return rawResult.map((row) => ({
          date: row.date,
          revenue: parseFloat(row.revenue),
          orders: parseInt(row.orders, 10),
          avgOrderValue: parseFloat(row.revenue) / parseInt(row.orders, 10),
        }));
      },
      { ttl: 300 },
    );
  }

  /** TOP PRODUCTS */
  async getTopProducts(days = 30): Promise<any[]> {
    return this.cacheService.getOrSet(
      `admin:top-products:${days}`,
      async () => {
        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - days);

        return this.orderRepository
          .createQueryBuilder('order')
          .innerJoin('order.items', 'oi')
          .select('oi.productId', 'productId')
          .addSelect('SUM(oi.quantity)', 'totalQuantity')
          .addSelect('SUM(oi.quantity * oi.price)', 'totalRevenue')
          .where('order.status = :status', { status: 'COMPLETED' })
          .andWhere('order.createdAt > :date', { date: dateThreshold })
          .groupBy('oi.productId')
          .orderBy('totalRevenue', 'DESC')
          .limit(10)
          .getRawMany();
      },
    );
  }

  /** Conversion Rate Calculation */
  private async calculateConversionRate(): Promise<string> {
    const totalVisitors = 10000; // mock, replace with real analytics
    const totalOrders = await this.orderRepository.count({
      where: { status: In(['PAID', 'COMPLETED']) },
    });

    return ((totalOrders / totalVisitors) * 100).toFixed(2);
  }
}
