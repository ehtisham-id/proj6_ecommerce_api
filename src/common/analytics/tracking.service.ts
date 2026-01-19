import { Injectable } from '@nestjs/common';
import { RedisService } from '@common/redis/redis.service';

@Injectable()
export class TrackingService {
  constructor(private redis: RedisService) {}

  async trackPageView(userId: string, page: string, props: any) {
    const event = {
      userId,
      event: 'page_view',
      page,
      props,
      timestamp: new Date().toISOString(),
    };

    // Real-time analytics stream
    await this.redis.xadd('analytics:stream', '*', ...Object.entries(event));
  }

  async trackConversion(userId: string, orderId: string, revenue: number) {
    await this.redis.hincrby('daily:revenue', new Date().toDateString(), revenue);
    await this.redis.sadd('converting_users', userId);
  }
}
