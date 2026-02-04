import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { RedisService } from '@common/redis/redis.service';
import { User } from '@database/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh.dto';
import { Role } from '@common/types/role.type';

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
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existingUser) throw new ConflictException('Email already exists');

    const user = this.userRepository.create(dto);
    user.role = dto.role || Role.CUSTOMER; // fixed Role typing
    const savedUser = await this.userRepository.save(user);

    const accessToken = this.generateAccessToken(savedUser);
    const refreshToken = this.generateRefreshToken(savedUser.id);

    try {
      await this.redisService.set(
        `${this.refreshTokenPrefix}${refreshToken}`,
        savedUser.id,
        { EX: this.getRefreshTokenExpiry() },
      );
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error('Failed to store refresh token in Redis:', errMsg);
    }

    return {
      user: this.sanitizeUser(savedUser),
      tokens: { accessToken, refreshToken },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email, isActive: true, deletedAt: IsNull() },
    });

    try {
      const match = user && (await bcrypt.compare(dto.password, user.password));
      if (!user || !match) {
        throw new UnauthorizedException('Invalid credentials');
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('Error comparing passwords in login:', errMsg);
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user.id);

    // Log tokens (redact in production) to help debugging when UI reports none.
    try {
      console.debug('Generated tokens for user:', {
        userId: user.id,
        accessTokenExists: !!accessToken,
        refreshTokenExists: !!refreshToken,
      });
    } catch (e) {
      // ignore logging errors
    }

    try {
      await this.redisService.set(
        `${this.refreshTokenPrefix}${refreshToken}`,
        user.id,
        { EX: this.getRefreshTokenExpiry() },
      );
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error('Failed to store refresh token in Redis:', errMsg);
    }

    return {
      user: this.sanitizeUser(user),
      tokens: { accessToken, refreshToken },
    };
  }

  async refresh(refreshToken: string) {
    const userId = await this.redisService.get(
      `${this.refreshTokenPrefix}${refreshToken}`,
    );
    if (!userId) throw new UnauthorizedException('Invalid refresh token');

    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true },
    });
    if (!user) throw new BadRequestException('User not found');

    try {
      await this.redisService.del(`${this.refreshTokenPrefix}${refreshToken}`);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error('Failed to delete refresh token from Redis:', errMsg);
    }

    const newAccessToken = this.generateAccessToken(user);
    const newRefreshToken = this.generateRefreshToken(user.id);

    await this.redisService.set(
      `${this.refreshTokenPrefix}${newRefreshToken}`,
      user.id,
      { EX: this.getRefreshTokenExpiry() },
    );

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
    try {
      return this.jwtService.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
      });
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error('Failed to generate access token:', errMsg);
      throw new InternalServerErrorException('Failed to generate access token');
    }
  }

  private generateRefreshToken(userId: string): string {
    try {
      return this.jwtService.sign(
        { sub: userId },
        {
          secret: this.configService.get('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
        },
      );
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error('Failed to generate refresh token:', errMsg);
      throw new InternalServerErrorException(
        'Failed to generate refresh token',
      );
    }
  }

  private getRefreshTokenExpiry(): number {
    const expiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
    const unit = expiresIn.slice(-1);
    const num = parseInt(expiresIn.slice(0, -1), 10);
    if (unit === 'd') return num * 24 * 60 * 60;
    if (unit === 'h') return num * 60 * 60;
    if (unit === 'm') return num * 60;
    return parseInt(expiresIn, 10);
  }

  private sanitizeUser(user: User) {
    const { password, ...sanitized } = user;
    return sanitized;
  }
}
