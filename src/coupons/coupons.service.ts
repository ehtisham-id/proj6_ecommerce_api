import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThanOrEqual } from 'typeorm';
import { Coupon, CouponUsage } from './entities/coupon.entity';
import { CreateCouponDto, ApplyCouponDto } from './dto';
import { DiscountType } from '@common/enums/discount-type.enum';
import { User } from '../users/entities/user.entity';

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
    private couponRepository: Repository<Coupon>,
    @InjectRepository(CouponUsage)
    private usageRepository: Repository<CouponUsage>,
  ) {}

  async create(createCouponDto: CreateCouponDto, adminId?: string): Promise<Coupon> {
    const existingCoupon = await this.couponRepository.findOne({
      where: { code: createCouponDto.code }
    });

    if (existingCoupon) {
      throw new ConflictException('Coupon code already exists');
    }

    // Validate discount value based on type
    if (createCouponDto.discountType === DiscountType.PERCENTAGE && 
        (createCouponDto.discountValue > 100 || createCouponDto.discountValue < 0)) {
      throw new BadRequestException('Percentage discount must be between 0 and 100');
    }

    const coupon = this.couponRepository.create({
      ...createCouponDto,
      expiresAt: new Date(createCouponDto.expiresAt),
      isPublic: createCouponDto.isPublic ?? true,
    });

    return this.couponRepository.save(coupon);
  }

  async findAll(): Promise<Coupon[]> {
    return this.couponRepository.find({
      where: { isActive: true, deletedAt: null },
      order: { expiresAt: 'ASC', usedCount: 'DESC' },
    });
  }

  async applyCoupon(userId: string, dto: ApplyCouponDto): Promise<CouponValidationResult> {
    const coupon = await this.couponRepository.findOne({
      where: { 
        code: dto.code,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!coupon) {
      return { valid: false, discountAmount: 0, message: 'Coupon not found' };
    }

    // Validation checks
    const validationErrors: string[] = [];

    if (coupon.isExpired) {
      validationErrors.push('Coupon expired');
    }

    if (coupon.isMaxUsesReached) {
      validationErrors.push('Maximum uses reached');
    }

    if (coupon.minOrderAmount && dto.orderAmount < coupon.minOrderAmount) {
      validationErrors.push(`Minimum order amount: ${coupon.minOrderAmount}`);
    }

    // Check user usage limit
    const userUsageCount = await this.usageRepository.count({
      where: { couponId: coupon.id, userId }
    });

    if (userUsageCount >= coupon.maxUsesPerUser) {
      validationErrors.push('Maximum uses per user reached');
    }

    if (validationErrors.length > 0) {
      return { 
        valid: false, 
        discountAmount: 0, 
        message: validationErrors.join(', ') 
      };
    }

    // Calculate discount
    let discountAmount: number;
    switch (coupon.discountType) {
      case DiscountType.PERCENTAGE:
        discountAmount = (dto.orderAmount * coupon.discountValue) / 100;
        break;
      case DiscountType.FIXED_AMOUNT:
        discountAmount = Math.min(coupon.discountValue, dto.orderAmount);
        break;
      case DiscountType.FREE_SHIPPING:
        discountAmount = 0; // Handled separately in orders
        break;
      default:
        discountAmount = 0;
    }

    return { valid: true, discountAmount, coupon };
  }

  async recordUsage(couponId: string, userId: string, orderId: string, orderAmount: number, discountAmount: number): Promise<void> {
    const coupon = await this.couponRepository.findOne({ where: { id: couponId } });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    // Create usage record
    const usage = this.usageRepository.create({
      couponId,
      userId,
      orderId,
      orderAmount,
      discountAmount,
    });

    await this.usageRepository.save(usage);

    // Update coupon usage count
    coupon.usedCount += 1;
    await this.couponRepository.save(coupon);
  }

  async delete(id: string): Promise<void> {
    await this.couponRepository.softDelete(id);
  }
}
