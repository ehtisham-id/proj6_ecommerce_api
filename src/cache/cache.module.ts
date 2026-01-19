import { Module, Global } from '@nestjs/common';
import { RedisModule } from '@common/redis/redis.module';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [RedisModule],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
