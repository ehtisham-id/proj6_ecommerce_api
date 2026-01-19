import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
} from 'typeorm';
import { IsString, IsBoolean, IsNumber, IsOptional } from 'class-validator';
import { Product } from './product.entity';

@Entity('product_images')
export class ProductImage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @IsString()
  url!: string;

  @Column({ default: false })
  @IsBoolean()
  isPrimary!: boolean;

  @Column('int', { default: 0 })
  @IsNumber()
  sortOrder!: number;

  @Column({ nullable: true })
  @IsString()
  originalName?: string;

  @ManyToOne(() => Product, (product) => product.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'productId' })
  product!: Product;

  @Column()
  productId!: string;

  @DeleteDateColumn()
  deletedAt?: Date;
}
