import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { RedisService } from '@common/redis/redis.service';
import { User } from '@database/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh.dto';

@Injectable()
export class AuthService {
  private readonly refreshTokenPrefix = 'rtbl:';

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const user = this.userRepository.create(dto);
    user.role = dto.role || 'CUSTOMER';
    const savedUser = await this.userRepository.save(user);

    const accessToken = this.generateAccessToken(savedUser);
    const refreshToken = this.generateRefreshToken(savedUser.id);

    await this.redisService.set(`${this.refreshTokenPrefix}${refreshToken}`, savedUser.id, {
      EX: this.getRefreshTokenExpiry(),
    });

    return {
      user: this.sanitizeUser(savedUser),
      tokens: { accessToken, refreshToken },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({ 
      where: { email: dto.email, isActive: true, deletedAt: null } 
    });
    
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user.id);

    await this.redisService.set(`${this.refreshTokenPrefix}${refreshToken}`, user.id, {
      EX: this.getRefreshTokenExpiry(),
    });

    // Blacklist old tokens (simplified - in production, track per-user tokens)
    return {
      user: this.sanitizeUser(user),
      tokens: { accessToken, refreshToken },
    };
  }

  async refresh(refreshToken: string) {
    const userId = await this.redisService.get(`${this.refreshTokenPrefix}${refreshToken}`);
    if (!userId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userRepository.findOne({ where: { id: userId, isActive: true } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Delete old refresh token
    await this.redisService.del(`${this.refreshTokenPrefix}${refreshToken}`);

    const newAccessToken = this.generateAccessToken(user);
    const newRefreshToken = this.generateRefreshToken(user.id);

    // Store new refresh token
    await this.redisService.set(`${this.refreshTokenPrefix}${newRefreshToken}`, user.id, {
      EX: this.getRefreshTokenExpiry(),
    });

    return {
      user: this.sanitizeUser(user),
      tokens: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    };
  }

  async logout(refreshToken: string) {
    await this.redisService.del(`${this.refreshTokenPrefix}${refreshToken}`);
    return { message: 'Logged out successfully' };
  }

  private generateAccessToken(user: User): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  private generateRefreshToken(userId: string): string {
    return this.jwtService.sign({ sub: userId }, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
    });
  }

  private getRefreshTokenExpiry(): number {
    const expiresIn = this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d';
    return Math.floor(new Date(expiresIn).getTime() / 1000);
  }

  private sanitizeUser(user: User) {
    const { password, ...sanitized } = user;
    return sanitized;
  }
}
