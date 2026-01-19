import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Tree, TreeChildren, TreeParent, TreeLevelColumn, Index } from 'typeorm';
import { IsString, Length, IsBoolean, IsOptional } from 'class-validator';

@Entity('categories')
@Tree('closure-table')
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

  @Column({ default: true })
  @IsBoolean()
  isActive!: boolean;

  @Column({ nullable: true })
  parentId?: string;

  @TreeChildren()
  children!: Category[];

  @TreeParent()
  parent!: Category;

  @TreeLevelColumn()
  level!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
