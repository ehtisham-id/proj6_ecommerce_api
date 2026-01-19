import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, OneToMany, ManyToOne, Index, Check } from 'typeorm';
import { Exclude } from 'class-transformer';
import { IsUUID, IsEnum, IsString, IsDecimal } from 'class-validator';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';
import { OrderShipment } from './order-shipment.entity';
import { OrderStatus } from '@common/enums/order-status.enum';

@Entity('orders')
@Index('idx_orders_user', ['userId'])
@Index('idx_orders_status', ['status'])
@Index('idx_orders_created', ['createdAt'])
@Check('"totalAmount" >= 0')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string ;

  @Column()
  userId!: string;

  @ManyToOne(() => User)
  user!: User;

  @Column('decimal', { precision: 12, scale: 2 })
  totalAmount!: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  discountAmount!: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  taxAmount!: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  shippingAmount!: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus = OrderStatus.PENDING;

  @Column()
  @IsString()
  currency: string = 'USD';

  @Column({ nullable: true })
  @Exclude()
  paymentIntentId?: string;

  @Column({ nullable: true })
  @IsUUID()
  couponId?: string;

  @Column('jsonb', { nullable: true })
  shippingAddress: any;

  @Column('jsonb', { nullable: true })
  billingAddress: any;

  @OneToMany(() => OrderItem, item => item.order)
  items!: OrderItem[];

  @OneToMany(() => OrderShipment, shipment => shipment.order)
  shipments!: OrderShipment[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
