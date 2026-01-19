import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SecurityService } from '../security/security.service';

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  constructor(private securityService: SecurityService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const userId = req['user']?.id || 'anonymous';
    const ip = this.getClientIp(req);
    const method = req.method;
    const url = req.originalUrl;

    res.on('finish', async () => {
      const duration = Date.now() - start;
      const status = res.statusCode;
      
      // Log sensitive actions
      if (status >= 400 || ['POST', 'PUT', 'DELETE'].includes(method)) {
        await this.securityService.logSecurityEvent(
          `${method} ${url}`,
          userId,
          ip,
          req.get('user-agent') || '',
          { status, duration }
        );
      }
    });

    next();
  }

  private getClientIp(req: any): string {
    return req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
  }
}
