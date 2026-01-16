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

