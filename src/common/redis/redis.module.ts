import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';
import Redis from 'ioredis';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        return new Redis({
          host: configService.get('REDIS_HOST'),
          port: +configService.get('REDIS_PORT'),
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        });
      },
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: [RedisService, 'REDIS_CLIENT'],
})
export class RedisModule {}
