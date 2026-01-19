import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  BeforeInsert,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { IsEmail, MinLength, IsEnum } from 'class-validator';

import { Role } from '@common/types/role.type';

@Entity('users')
@Index(['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @IsEmail()
  email!: string;

  @Column({ length: 50 })
  @MinLength(3)
  firstName!: string;

  @Column({ length: 50 })
  lastName!: string;

  @Column()
  @Exclude()
  password!: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: 'user',
  })
  @IsEnum(Role)
  role!: Role;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date ;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

   @BeforeInsert()
  async hashPassword() {
    if (this.password) {
      const bcrypt = await import('bcryptjs');
      this.password = await bcrypt.hash(this.password, 12);
    }
  }
}
