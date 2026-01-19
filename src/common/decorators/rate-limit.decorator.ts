import { applyDecorators } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

export function ReviewRateLimit(ttl: number = 3600, limit: number = 5) {
  return applyDecorators(
    UseGuards(ThrottlerGuard),
    // Custom metadata for review-specific throttling
  );
}
