import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, Index, Check } from 'typeorm';
import { IsEnum, IsUUID, IsDecimal, Min } from 'class-validator';
import { Order } from '../../orders/entities/order.entity';

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

@Entity('payments')
@Index('idx_payments_order', ['orderId'])
@Index('idx_payments_status', ['status'])
@Index('idx_payments_idempotency', ['idempotencyKey'], { unique: true })
@Check('"amount" > 0')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  idempotencyKey!: string;

  @Column()
  orderId!: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  order!: Order;

  @Column('decimal', { precision: 12, scale: 2 })
  @Min(0.01)
  amount!: number;

  @Column()
  currency: string = 'USD';

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status!: PaymentStatus;

  @Column({ nullable: true })
  paymentIntentId!: string;

  @Column('jsonb', { nullable: true })
  paymentMethod: any;

  @Column({ nullable: true })
  clientSecret?: string;

  @Column('text', { nullable: true })
  failureReason?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
