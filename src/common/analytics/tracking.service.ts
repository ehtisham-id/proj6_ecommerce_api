import { Injectable } from '@nestjs/common';
import { RedisService } from '@common/redis/redis.service';

@Injectable()
export class TrackingService {
  constructor(private redis: RedisService) {}

  private get client() {
    return this.redis.getClient(); // get raw Redis client
  }

  async trackPageView(userId: string, page: string, props: any) {
    const event = {
      userId,
      event: 'page_view',
      page,
      props: JSON.stringify(props), // Redis streams require string
      timestamp: new Date().toISOString(),
    };

    // Real-time analytics stream
    await this.client.xadd(
      'analytics:stream',
      '*',
      ...Object.entries(event).flat(),
    );
  }

  async trackConversion(userId: string, orderId: string, revenue: number) {
    const today = new Date().toDateString();

    // Increment daily revenue
    await this.client.hincrby('daily:revenue', today, revenue);

    // Track unique converting users
    await this.client.sadd('converting_users', userId);
  }
}
