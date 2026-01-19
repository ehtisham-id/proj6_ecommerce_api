import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';

import { Coupon } from './entities/coupon.entity';
import { CouponUsage } from './entities/coupon-usage.entity';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
import { DiscountType } from '@common/enums/discount-type.enum';

interface CouponValidationResult {
  valid: boolean;
  discountAmount: number;
  message?: string;
  coupon?: Coupon;
}

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,

    @InjectRepository(CouponUsage)
    private readonly usageRepository: Repository<CouponUsage>,
  ) {}

  async create(dto: CreateCouponDto): Promise<Coupon> {
    const exists = await this.couponRepository.findOne({
      where: { code: dto.code },
    });

    if (exists) {
      throw new ConflictException('Coupon code already exists');
    }

    if (
      dto.discountType === DiscountType.PERCENTAGE &&
      (dto.discountValue <= 0 || dto.discountValue > 100)
    ) {
      throw new BadRequestException(
        'Percentage discount must be between 1 and 100',
      );
    }

    const coupon = this.couponRepository.create({
      ...dto,
      expiresAt: new Date(dto.expiresAt),
      isPublic: dto.isPublic ?? true,
      usedCount: 0,
      isActive: true,
    });

    return this.couponRepository.save(coupon);
  }

  async findAll(): Promise<Coupon[]> {
    return this.couponRepository.find({
      where: {
        isActive: true,
        deletedAt: IsNull(),
      },
      order: {
        expiresAt: 'ASC',
        usedCount: 'DESC',
      },
    });
  }

  async applyCoupon(
    userId: string,
    dto: ApplyCouponDto,
  ): Promise<CouponValidationResult> {
    const coupon = await this.couponRepository.findOne({
      where: {
        code: dto.code,
        isActive: true,
        deletedAt: IsNull(),
      },
    });

    if (!coupon) {
      return { valid: false, discountAmount: 0, message: 'Coupon not found' };
    }

    const errors: string[] = [];

    if (coupon.expiresAt < new Date()) {
      errors.push('Coupon expired');
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      errors.push('Maximum uses reached');
    }

    if (coupon.minOrderAmount && dto.orderAmount < coupon.minOrderAmount) {
      errors.push(`Minimum order amount is ${coupon.minOrderAmount}`);
    }

    const userUsageCount = await this.usageRepository.count({
      where: {
        couponId: coupon.id,
        userId,
      },
    });

    if (coupon.maxUsesPerUser && userUsageCount >= coupon.maxUsesPerUser) {
      errors.push('Maximum uses per user reached');
    }

    if (errors.length > 0) {
      return {
        valid: false,
        discountAmount: 0,
        message: errors.join(', '),
      };
    }

    let discountAmount = 0;

    switch (coupon.discountType) {
      case DiscountType.PERCENTAGE:
        discountAmount = (dto.orderAmount * coupon.discountValue) / 100;
        break;

      case DiscountType.FIXED_AMOUNT:
        discountAmount = Math.min(coupon.discountValue, dto.orderAmount);
        break;

      case DiscountType.FREE_SHIPPING:
        discountAmount = 0;
        break;
    }

    return {
      valid: true,
      discountAmount,
      coupon,
    };
  }

  async recordUsage(
    couponId: string,
    userId: string,
    orderId: string,
    orderAmount: number,
    discountAmount: number,
  ): Promise<void> {
    const coupon = await this.couponRepository.findOne({
      where: { id: couponId },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    const usage = this.usageRepository.create({
      couponId,
      userId,
      orderId,
      orderAmount,
      discountAmount,
    });

    await this.usageRepository.save(usage);

    coupon.usedCount += 1;
    await this.couponRepository.save(coupon);
  }

  async delete(id: string): Promise<void> {
    await this.couponRepository.softDelete(id);
  }
}
