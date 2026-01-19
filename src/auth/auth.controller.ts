import { Controller, Post, Body, UseGuards, Req, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto';
import { RefreshTokenDto } from './dto/refresh.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register new user' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  logout(@Req() req: any, @Res() res: any) {
    return this.authService.logout(req.headers.authorization?.split(' ')[1]);
  }

  // src/modules/auth/auth.controller.ts
@Post('login')
@UseGuards(BruteForceGuard) // Add brute force protection
async login(@Body() loginDto: LoginDto, @Req() req: Request) {
  const ip = this.getClientIp(req);
  
  // Rate limit login attempts
  const loginKey = `rate:login:${ip}`;
  if (!(await this.rateLimitService.checkLimit(loginKey, 'login'))) {
    throw new UnauthorizedException('Too many login attempts');
  }
  
  // Login logic...
}

}
