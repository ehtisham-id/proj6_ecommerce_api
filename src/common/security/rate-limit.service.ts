import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RateLimitService {
  private readonly limits = {
    login: { windowMs: 15 * 60 * 1000, max: 5 },
    signup: { windowMs: 60 * 60 * 1000, max: 3 },
    api: { windowMs: 15 * 60 * 1000, max: 100 },
    bruteForce: { windowMs: 60 * 60 * 1000, max: 10 },
  };

  constructor(@Inject('REDIS_CLIENT') private redis: Redis) {}

  async checkLimit(key: string, limitType: keyof typeof this.limits): Promise<boolean> {
    const limit = this.limits[limitType];
    const windowStart = Date.now() - limit.windowMs;
    
    const requestCount = await this.redis.zcount(key, windowStart, 'inf');
    
    if (requestCount >= limit.max) {
      return false;
    }

    await this.redis.zadd(key, Date.now(), Date.now());
    await this.redis.zremrangebyscore(key, 0, windowStart);
    await this.redis.expire(key, Math.ceil(limit.windowMs / 1000));
    
    return true;
  }
}
