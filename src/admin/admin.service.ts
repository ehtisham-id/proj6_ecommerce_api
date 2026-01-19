import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { Order } from '../orders/entities/order.entity';
import { AnalyticsFilterDto } from './dto';
import { CacheService } from '@common/cache/cache.service';

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
  totalProducts: number;
  avgOrderValue: number;
  conversionRate: number;
  activeSellers: number;
}

interface RevenueReport {
  date: string;
  revenue: number;
  orders: number;
  avgOrderValue: number;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(AuditLog)
    private auditRepository: Repository<AuditLog>,
    private cacheService: CacheService,
  ) {}

  async getDashboardStats(): Promise<DashboardStats> {
    const cacheKey = 'admin:dashboard:stats';
    
    return this.cacheService.getOrSet(cacheKey, async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [
        { totalRevenue },
        { totalOrders },
        { count: totalUsers },
        { count: totalProducts },
        { avgOrderValue },
        { conversionRate },
        { count: activeSellers }
      ] = await Promise.all([
        this.orderRepository
          .createQueryBuilder('order')
          .select('SUM(order.totalAmount)', 'totalRevenue')
          .where('order.status = :status', { status: 'COMPLETED' })
          .getRawOne(),

        this.orderRepository.count({
          where: { status: In(['PAID', 'COMPLETED']) }
        }),

        this.userRepository.count(),
        this.productRepository.count({ where: { status: 'PUBLISHED' } }),

        this.orderRepository
          .createQueryBuilder('order')
          .select('AVG(order.totalAmount)', 'avgOrderValue')
          .where('order.status = :status', { status: 'COMPLETED' })
          .getRawOne(),

        this.calculateConversionRate(),
        
        this.userRepository.count({
          where: { role: 'SELLER', isActive: true }
        }),
      ]);

      return {
        totalRevenue: parseFloat(totalRevenue || '0'),
        totalOrders: totalOrders || 0,
        totalUsers: totalUsers || 0,
        totalProducts: totalProducts || 0,
        avgOrderValue: parseFloat(avgOrderValue || '0'),
        conversionRate: parseFloat(conversionRate || '0'),
        activeSellers: activeSellers || 0,
      };
    }, { ttl: 60 }); // 1 minute cache
  }

  async getRevenueReport(filter: AnalyticsFilterDto): Promise<RevenueReport[]> {
    const cacheKey = `admin:revenue:${JSON.stringify(filter)}`;
    
    return this.cacheService.getOrSet(cacheKey, async () => {
      const startDate = filter.startDate ? new Date(filter.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = filter.endDate ? new Date(filter.endDate) : new Date();

      const result = await this.orderRepository
        .createQueryBuilder('order')
        .select("DATE_TRUNC('day', order.createdAt)", 'date')
        .addSelect('SUM(order.totalAmount)', 'revenue')
        .addSelect('COUNT(order.id)', 'orders')
        .where('order.status = :status', { status: 'COMPLETED' })
        .andWhere('order.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
        .groupBy("DATE_TRUNC('day', order.createdAt)")
        .orderBy("DATE_TRUNC('day', order.createdAt)", 'DESC')
        .getRawMany();

      return result.map(row => ({
        date: row.date,
        revenue: parseFloat(row.revenue),
        orders: parseInt(row.orders),
        avgOrderValue: parseFloat(row.revenue) / parseInt(row.orders),
      }));
    }, { ttl: 300 });
  }

  async getTopProducts(days = 30): Promise<any[]> {
    return this.cacheService.getOrSet(`admin:top-products:${days}`, async () => {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);

      return this.orderRepository
        .createQueryBuilder('order')
        .select('oi.productId', 'productId')
        .addSelect('SUM(oi.quantity)', 'totalQuantity')
        .addSelect('SUM(oi.quantity * oi.price)', 'totalRevenue')
        .innerJoin('order.items', 'oi')
        .where('order.status = :status', { status: 'COMPLETED' })
        .andWhere('order.createdAt > :date', { date: dateThreshold })
        .groupBy('oi.productId')
        .orderBy('totalRevenue', 'DESC')
        .limit(10)
        .getRawMany();
    });
  }

  async getUserActivityReport(): Promise<any> {
    return {
      // Daily active users
      // Retention cohorts
      // Registration sources
      // Geographic distribution
    };
  }

  private async calculateConversionRate(): Promise<string> {
    const [{ totalVisitors }, { totalOrders }] = await Promise.all([
      // Would come from analytics tracking
      Promise.resolve({ totalVisitors: 10000 }),
      this.orderRepository.count({ where: { status: In(['PAID', 'COMPLETED']) } }),
    ]);

    return ((totalOrders / totalVisitors) * 100).toFixed(2);
  }
}
