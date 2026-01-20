import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { BruteForceGuard } from '@common/guards/brute-force.guard';
import { RateLimitService } from '@common/security/rate-limit.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private rateLimitService: RateLimitService, // injected
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  logout(@Req() req: any, @Res() res: any) {
    return this.authService.logout(req.headers.authorization?.split(' ')[1]);
  }

  @Post('login')
  @UseGuards(BruteForceGuard)
  async login(@Body() loginDto: LoginDto, @Req() req: any) {
    const ip = this.getClientIp(req);

    const loginKey = `rate:login:${ip}`;
    if (!(await this.rateLimitService.checkLimit(loginKey, 'login'))) {
      throw new UnauthorizedException('Too many login attempts');
    }

    return this.authService.login(loginDto);
  }

  // Helper to get client IP
  private getClientIp(req: any): string {
    return (
      req.headers['x-forwarded-for'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      ''
    ).toString();
  }
}
