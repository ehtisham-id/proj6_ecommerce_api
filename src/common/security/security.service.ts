import { Injectable, HttpException, HttpStatus, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import Redis from 'ioredis';

@Injectable()
export class SecurityService {
  constructor(@Inject('REDIS_CLIENT') private redis: Redis) {}

  generateToken(length = 64): string {
    return crypto.randomBytes(length).toString('hex');
  }

  async hashPassword(password: string): Promise<string> {
    return crypto.pbkdf2Sync(password, process.env.PASSWORD_SALT!, 100000, 64, 'sha512').toString('hex');
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const hashed = crypto.pbkdf2Sync(password, process.env.PASSWORD_SALT!, 100000, 64, 'sha512').toString('hex');
    return hashed === hash;
  }

  async logSecurityEvent(
    event: string,
    userId: string,
    ip: string,
    userAgent: string,
    details?: any
  ): Promise<void> {
    const logEntry = {
      event,
      userId,
      ip,
      userAgent,
      details,
      timestamp: new Date().toISOString(),
    };

    await this.redis.lpush('security:events', JSON.stringify(logEntry));
    await this.redis.ltrim('security:events', 0, 9999); // Keep last 10k events
  }

  validateApiKey(apiKey: string): boolean {
    // Production: JWT verification + signature validation
    return apiKey.startsWith('sk_') && apiKey.length === 64;
  }
}
