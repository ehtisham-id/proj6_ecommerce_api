import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index } from 'typeorm';
import { IsUUID, IsInt, IsPositive, IsDecimal } from 'class-validator';
import { Order } from './order.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('order_items')
@Index('idx_order_items_order', ['orderId'])
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  order: Order;

  @Column()
  productId: string;

  @ManyToOne(() => Product)
  product: Product;

  @Column('int')
  @IsInt()
  @IsPositive()
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  @IsDecimal()
  price: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  discount: number;
}
