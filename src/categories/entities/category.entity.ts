import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index } from 'typeorm';
import { IsString, Length, IsBoolean, IsOptional } from 'class-validator';

@Entity('categories')
@Index('idx_categories_name', ['name'])
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @IsString()
  @Length(3, 100)
  name!: string;

  @Column({ nullable: true })
  @IsString()
  description?: string;

  @Column({ length: 100, unique: true })
  @IsString()
  @Length(3, 100)
  slug!: string;

  @Column({ default: true })
  @IsBoolean()
  isActive!: boolean;


  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
