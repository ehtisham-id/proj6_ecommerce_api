import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

export enum CacheLevel {
  L1 = 'L1', // Memory (fastest)
  L2 = 'L2', // Redis (persistent)
}

export interface CacheOptions {
  ttl?: number; // seconds
  level?: CacheLevel;
  keyPrefix?: string;
  compress?: boolean;
}

@Injectable()
export class CacheService {
  private readonly memoryCache = new Map<string, { data: any; expiry: number }>();

  constructor(@Inject('REDIS_CLIENT') private redis: Redis) {}

  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    // L1: Memory cache
    if (options.level !== CacheLevel.L2) {
      const memoryItem = this.memoryCache.get(key);
      if (memoryItem && Date.now() < memoryItem.expiry) {
        return memoryItem.data as T;
      }
    }

    // L2: Redis
    let data: string | null;
    if (options.compress) {
      data = await this.redis.get(`z:${key}`); // zlib compressed
    } else {
      data = await this.redis.get(key);
    }

    if (data) {
      const parsed = JSON.parse(data);
      // Populate L1 cache
      if (options.level !== CacheLevel.L2) {
        this.memoryCache.set(key, {
          data: parsed,
          expiry: Date.now() + (options.ttl || 300) * 1000,
        });
      }
      return parsed as T;
    }

    return null;
  }

  async set(key: string, data: any, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl || 300; // 5 minutes default
    const value = JSON.stringify(data);

    // L1: Memory cache
    if (options.level !== CacheLevel.L2) {
      this.memoryCache.set(key, {
        data,
        expiry: Date.now() + ttl * 1000,
      });
    }

    // L2: Redis
    if (options.compress && value.length > 1024) {
      const compressed = await this.compress(value);
      await this.redis.setex(`z:${key}`, ttl, compressed);
    } else {
      await this.redis.setex(key, ttl, value);
    }
  }

  async invalidate(pattern: string): Promise<void> {
    // Invalidate memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
      }
    }

    // Redis pattern delete (using SCAN)
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', `*${pattern}*`, 'COUNT', 100);
      cursor = nextCursor;
      
      if (keys.length > 0) {
        const pipeline = this.redis.pipeline();
        keys.forEach(key => {
          pipeline.del(key);
          pipeline.del(`z:${key}`); // compressed keys too
        });
        await pipeline.exec();
      }
    } while (cursor !== '0');
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    let data = await this.get<T>(key, options);
    
    if (!data) {
      data = await factory();
      await this.set(key, data, options);
    }
    
    return data;
  }

  private async compress(data: string): Promise<string> {
    return Buffer.from(data).toString('base64'); // Simplified compression
  }
}
