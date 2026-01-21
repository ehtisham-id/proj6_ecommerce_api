import { Module, Global } from '@nestjs/common';
import { SecurityService } from './security.service';
import { RateLimitService } from './rate-limit.service';

@Global()
@Module({
  providers: [SecurityService, RateLimitService],
  exports: [SecurityService, RateLimitService],
})
export class SecurityModule {}
