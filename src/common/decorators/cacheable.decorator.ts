import { SetMetadata } from '@nestjs/common';

export const Cacheable = (options: {
  ttl?: number;
  level?: 'L1' | 'L2';
  keyPrefix?: string;
  compress?: boolean;
} = {}) => SetMetadata('cache-options', options);
