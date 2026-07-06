import {
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Comment } from './comment.entity';
import { User } from '../users/user.entity';

@Entity('comment_mentions')
@Unique(['comment', 'user'])
export class CommentMention {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @ManyToOne(() => Comment, (comment) => comment.mentions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'comment_id' })
  comment: Comment;

  @Index()
  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
