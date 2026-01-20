import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity('order_shipments')
export class OrderShipment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  orderId!: string;

  @Column()
  carrier!: string;

  @Column()
  trackingNumber!: string;

  @Column({ nullable: true })
  shippedAt?: Date;

  @ManyToOne(() => Order, order => order.shipments, {
    onDelete: 'CASCADE',
  })
  order!: Order;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
