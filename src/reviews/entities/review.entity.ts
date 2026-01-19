import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { IsInt, Min, Max, IsString, Length, IsBoolean, IsEnum } from 'class-validator';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';

export enum ReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('reviews')
@Index('idx_reviews_product', ['productId'])
@Index('idx_reviews_user', ['userId'])
@Index('idx_reviews_status', ['status'])
@Index('idx_reviews_rating', ['rating'])
@Index(['productId', 'status'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  productId!: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product!: Product;

  @Column()
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column('int')
  @Min(1)
  @Max(5)
  rating!: number;

  @Column('text')
  @Length(10, 2000)
  comment!: string;

  @Column({ default: ReviewStatus.PENDING })
  status!: ReviewStatus;

  @Column({ default: true })
  isHelpful!: boolean;

  @Column('int', { default: 0 })
  helpfulCount!: number;

  @Column({ nullable: true })
  reviewerName?: string; // For guest reviews

  @Column('jsonb', { nullable: true })
  images?: string[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
