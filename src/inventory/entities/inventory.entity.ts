import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, VersionColumn, Index, Check } from 'typeorm';
import { IsNumber, IsPositive, Min } from 'class-validator';
import { Product } from '../../products/entities/product.entity';

@Entity('inventory')
@Index('idx_inventory_product', ['productId'])
@Index('idx_inventory_available', ['availableQuantity'])
@Check('"reservedQuantity" >= 0')
@Check('"availableQuantity" >= 0')
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  productId!: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  product!: Product;

  @Column('int')
  @IsNumber()
  @IsPositive()
  availableQuantity!: number;

  @Column('int', { default: 0 })
  @Min(0)
  reservedQuantity!: number;

  @Column('int', { default: 0 })
  @Min(0)
  committedQuantity!: number;

  @VersionColumn()
  version!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Computed properties
  get totalQuantity(): number {
    return this.availableQuantity + this.reservedQuantity + this.committedQuantity;
  }
}
