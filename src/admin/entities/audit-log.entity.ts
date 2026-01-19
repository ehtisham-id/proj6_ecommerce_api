// src/modules/admin/entities/audit-log.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum AuditAction {
  USER_CREATED = 'USER_CREATED',
  ORDER_STATUS_CHANGED = 'ORDER_STATUS_CHANGED',
  PRODUCT_UPDATED = 'PRODUCT_UPDATED',
  COUPON_CREATED = 'COUPON_CREATED',
  INVENTORY_ADJUSTED = 'INVENTORY_ADJUSTED',
}

@Entity('audit_logs')
@Index('idx_audit_actor', ['actorId'])
@Index('idx_audit_action', ['action'])
@Index(['action', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  actorId!: string; // Admin/Seller/System user who performed action

  @ManyToOne(() => User)
  actor!: User;

  @Column()
  @Index()
  action!: AuditAction;

  @Column('uuid', { array: true, nullable: true })
  targetIds?: string[]; // Resources affected

  @Column('jsonb')
  before: any;

  @Column('jsonb')
  after: any;

  @Column('text')
  ipAddress!: string;

  @Column('text', { nullable: true })
  userAgent!: string;

  @Column('text', { nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
