import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class IdempotencyService {
  private readonly ttl = 24 * 60 * 60; // 24 hours

  constructor(@Inject('REDIS_CLIENT') private redis: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.redis.get(`idempotency:${key}`);
  }

  async set(key: string, value: string): Promise<void> {
    await this.redis.setex(`idempotency:${key}`, this.ttl, value);
  }
}
