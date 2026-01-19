import { Module, Global } from '@nestjs/common';
import { SecurityService } from './security.service';
import { RateLimitService } from './rate-limit.service';
import { HelmetMiddleware } from './helmet.middleware';

@Global()
@Module({
  providers: [SecurityService, RateLimitService],
  exports: [SecurityService, RateLimitService],
})
export class SecurityModule {
  configure(consumer: any) {
    consumer.apply(HelmetMiddleware).forRoutes('*');
  }
}
