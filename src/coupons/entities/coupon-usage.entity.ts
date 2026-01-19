import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Index } from 'typeorm';
import { Coupon } from './coupon.entity';
import { User } from '../../users/entities/user.entity';

@Entity('coupon_usages')
@Index('idx_coupon_usage_coupon_user', ['couponId', 'userId'])
export class CouponUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  couponId: string;

  @ManyToOne(() => Coupon, { onDelete: 'CASCADE' })
  coupon: Coupon;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  user: User;

  @Column('uuid')
  orderId: string;

  @Column('decimal', { precision: 12, scale: 2 })
  orderAmount: number;

  @Column('decimal', { precision: 12, scale: 2 })
  discountAmount: number;

  @CreateDateColumn()
  usedAt: Date;
}
