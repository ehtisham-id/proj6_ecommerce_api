import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = process.hrtime.bigint();
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap(() => {
        const duration = Number(process.hrtime.bigint() - start) / 1e6; // ms
        
        request.res.set('X-Response-Time', `${duration.toFixed(2)}ms`);
        console.log(`[${request.method}] ${request.path} - ${duration.toFixed(2)}ms`);
      }),
    );
  }
}
