import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { RateLimitService } from '../security/rate-limit.service';

@Injectable()
export class BruteForceGuard implements CanActivate {
  constructor(private rateLimitService: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = this.getClientIp(request);
    const userAgent = request.get('user-agent') || 'unknown';
    
    const loginKey = `brute:login:${ip}:${userAgent}`;
    
    const allowed = await this.rateLimitService.checkLimit(loginKey, 'bruteForce');
    if (!allowed) {
      throw new UnauthorizedException('Too many failed login attempts');
    }
    
    return true;
  }

  private getClientIp(req: any): string {
    return req.ip || req.connection.remoteAddress || 
           req.socket.remoteAddress || 
           (req.connection as any).socket.remoteAddress || 'unknown';
  }
}
