import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AuditLoggerService {
  private readonly logger = new Logger(AuditLoggerService.name);

  constructor(private redisService: RedisService) {}

  async log(event: string, data: Record<string, any>, userId?: string) {
    const auditEntry = {
      event,
      data,
      userId,
      timestamp: new Date().toISOString(),
    };

    // Log to Redis stream for analytics (Phase 14)
    await this.redisService.set(`audit:${Date.now()}`, JSON.stringify(auditEntry));
    
    this.logger.log(JSON.stringify(auditEntry));
  }
}
