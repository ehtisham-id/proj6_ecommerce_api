import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('carts')
@Index('idx_carts_user', ['userId'])
@Index('idx_carts_updated', ['updatedAt'])
export class Cart {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @ManyToOne(() => User)
  user!: User;

  @Column('jsonb')
  items!: Array<{
    productId: string;
    quantity: number;
    priceAtAdd: number;
    addedAt: string;
  }>;

  @Column('decimal', { precision: 12, scale: 2 })
  totalAmount!: number;

  @Column('int')
  totalQuantity!: number;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
