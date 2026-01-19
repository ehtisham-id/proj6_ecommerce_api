import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsPositive,
  IsBoolean,
  IsEnum,
  Length,
} from 'class-validator';
import { User } from '../../users/entities/user.entity';
import { Category } from '../../categories/entities/category.entity';
import { ProductImage } from './product-image.entity';

export enum ProductStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

@Entity('products')
@Index('idx_products_name', ['name'], { fulltext: true })
@Index('idx_products_seller', ['sellerId'])
@Index('idx_products_category', ['categoryId'])
@Index('idx_products_status', ['status'])
@Index('idx_products_price', ['price'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @IsString()
  @Length(3, 200)
  name!: string;

  @Column('text')
  @IsString()
  description!: string;

  @Column('decimal', { precision: 10, scale: 2 })
  @IsNumber()
  @IsPositive()
  price!: number;

  @Column()
  @IsNumber()
  @IsPositive()
  stockQuantity!: number;

  @Column({ default: 0 })
  @IsNumber()
  soldQuantity!: number;

  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.DRAFT,
  })
  @IsEnum(ProductStatus)
  status!: ProductStatus;

  @Column({ nullable: true })
  @IsString()
  sku?: string;

  @Column({ default: true })
  @IsBoolean()
  isActive!: boolean;

  @Column()
  sellerId!: string;

  @Column()
  categoryId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sellerId' })
  seller!: User;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category!: Category;
  @OneToMany(() => ProductImage, (image) => image.product)
  images!: ProductImage[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
