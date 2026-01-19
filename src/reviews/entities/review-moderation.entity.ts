import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Review } from './review.entity';
import { User } from '../../users/entities/user.entity';

@Entity('review_moderations')
export class ReviewModeration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  reviewId: string;

  @ManyToOne(() => Review, { onDelete: 'CASCADE' })
  review: Review;

  @Column()
  moderatorId: string;

  @ManyToOne(() => User)
  moderator: User;

  @Column('text')
  action: 'APPROVED' | 'REJECTED';

  @Column('text', { nullable: true })
  reason?: string;

  @CreateDateColumn()
  createdAt: Date;
}
