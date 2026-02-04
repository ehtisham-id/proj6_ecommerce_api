import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { RateLimitService } from '../security/rate-limit.service';

@Injectable()
export class BruteForceGuard implements CanActivate {
  constructor(private rateLimitService: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = this.getClientIp(request);
    // Support both Express (`request.get`) and Fastify (`request.headers`)
    let userAgent: string | undefined;
    try {
      if (typeof request.get === 'function') {
        userAgent = request.get('user-agent');
      } else if (request.headers) {
        userAgent =
          request.headers['user-agent'] || request.headers['User-Agent'];
      } else if (request.raw && request.raw.headers) {
        userAgent =
          request.raw.headers['user-agent'] ||
          request.raw.headers['User-Agent'];
      }
    } catch (e) {
      userAgent = undefined;
    }
    userAgent = (userAgent as string) || 'unknown';

    const loginKey = `brute:login:${ip}:${userAgent}`;

    const allowed = await this.rateLimitService.checkLimit(
      loginKey,
      'bruteForce',
    );
    if (!allowed) {
      throw new UnauthorizedException('Too many failed login attempts');
    }

    return true;
  }

  private getClientIp(req: any): string {
    // Try common properties across Express and Fastify
    if (!req) return 'unknown';
    const forwarded =
      (req.headers &&
        (req.headers['x-forwarded-for'] || req.headers['X-Forwarded-For'])) ||
      (req.raw &&
        req.raw.headers &&
        (req.raw.headers['x-forwarded-for'] ||
          req.raw.headers['X-Forwarded-For']));
    if (forwarded) {
      // X-Forwarded-For can be a list
      return String(forwarded).split(',')[0].trim();
    }
    return (
      req.ip ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      (req.raw && req.raw.socket && req.raw.socket.remoteAddress) ||
      'unknown'
    );
  }
}
