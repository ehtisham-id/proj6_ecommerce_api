import { Injectable, Global, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
@Global()
export class RedisService implements OnModuleInit {
  private readonly redis: Redis;

  constructor(private configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST'),
      port: +this.configService.get('REDIS_PORT'),
    });
  }

  onModuleInit() {
    this.redis.on('error', (err) => console.error('Redis error:', err));
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, options?: { EX?: number }): Promise<void> {
    if (options?.EX) {
      await this.redis.setex(key, options.EX, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
