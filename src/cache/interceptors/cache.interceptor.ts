import { 
  Injectable, 
  NestInterceptor, 
  ExecutionContext, 
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService, CacheOptions } from '../cache.service';
import { v4 as uuidv4 } from 'uuid';


@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private cacheService: CacheService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const cacheOptions = this.reflector.get<CacheOptions>('cache-options', context.getHandler());
    if (!cacheOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    const cacheKey = this.generateKey(request, cacheOptions);
    const ttl = cacheOptions.ttl || 300;

    // Try cache first
    const cached = await this.cacheService.get(cacheKey, cacheOptions);
    if (cached !== null) {
      response.set('X-Cache', 'HIT');
      return of(cached);
    }

    response.set('X-Cache', 'MISS');

    return next.handle().pipe(
      tap(async (data) => {
        await this.cacheService.set(cacheKey, data, { ...cacheOptions, ttl });
      }),
    );
  }

  private generateKey(request: any, options: CacheOptions): string {
    const { method, query, params, body } = request;
    const keyParts = [
      options.keyPrefix || 'api',
      method,
      request.path,
      JSON.stringify({ ...query, ...params }),
    ];
    
    return `cache:${uuidv4()}:${keyParts.join(':')}`;
  }
}
