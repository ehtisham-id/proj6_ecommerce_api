import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Index } from 'typeorm';
import { IsEnum } from 'class-validator';
import { Product } from '../../products/entities/product.entity';
import { User } from '../../users/entities/user.entity';

export enum InventoryTransactionType {
  STOCK_IN = 'STOCK_IN',
  STOCK_OUT = 'STOCK_OUT',
  RESERVATION = 'RESERVATION',
  COMMIT = 'COMMIT',
  CANCEL_RESERVATION = 'CANCEL_RESERVATION',
  ADJUSTMENT = 'ADJUSTMENT',
}

@Entity('inventory_transactions')
@Index('idx_inventory_tx_product', ['productId'])
@Index('idx_inventory_tx_type', ['type'])
export class InventoryTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  productId: string;

  @Column()
  inventoryId: string;

  @Column()
  @IsEnum(InventoryTransactionType)
  type: InventoryTransactionType;

  @Column('int')
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  referenceAmount?: number;

  @Column({ nullable: true })
  orderId?: string;

  @Column({ nullable: true })
  userId?: string;

  @Column('text', { nullable: true })
  reference?: string;

  @ManyToOne(() => User)
  user?: User;

  @CreateDateColumn()
  createdAt: Date;
}
