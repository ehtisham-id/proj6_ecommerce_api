import { Module, Global } from '@nestjs/common';
import { SecurityService } from './security.service';
import { RateLimitService } from './rate-limit.service';
import { RedisModule } from '@common/redis/redis.module';

@Global()
@Module({
  imports: [RedisModule],
  providers: [SecurityService, RateLimitService],
  exports: [SecurityService, RateLimitService],
})
export class SecurityModule {}
