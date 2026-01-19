import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index, ManyToOne } from 'typeorm';
import { IsEnum, IsString, Length, IsInt, Min, IsPositive, IsDateString, IsBoolean, IsOptional } from 'class-validator';
import { User } from '../../users/entities/user.entity';
import { DiscountType } from '@common/enums/discount-type.enum';

@Entity('coupons')
@Index('idx_coupons_code', ['code'], { unique: true })
@Index('idx_coupons_active', ['isActive', 'expiresAt'])
@Index('idx_coupons_type', ['discountType'])
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @IsString()
  @Length(4, 20)
  code!: string;

  @Column('decimal', { precision: 8, scale: 2 })
  discountValue!: number;

  @Column({
    type: 'enum',
    enum: DiscountType,
  })
  discountType!: DiscountType;

  @Column('int')
  @Min(0)
  maxUses!: number;

  @Column('int', { default: 0 })
  usedCount!: number;

  @Column('int', { default: 1 })
  maxUsesPerUser!: number;

  @Column()
  @IsDateString()
  expiresAt!: Date;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: false })
  isPublic!: boolean; // vs private for specific users

  @Column('uuid', { nullable: true, array: true })
  allowedUserIds?: string[];

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  minOrderAmount?: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  // Computed
  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  get isMaxUsesReached(): boolean {
    return this.usedCount >= this.maxUses;
  }
}
