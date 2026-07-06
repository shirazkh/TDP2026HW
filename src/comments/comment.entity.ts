import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  VersionColumn,
} from 'typeorm';
import { IssueFlowBaseEntity } from '../common/entities/base.entity';
import { Ticket } from '../tickets/ticket.entity';
import { User } from '../users/user.entity';
import { CommentMention } from './comment-mention.entity';

@Entity('comments')
export class Comment extends IssueFlowBaseEntity {
  @Index()
  @Column({ name: 'ticket_id' })
  ticketId: number;

  @ManyToOne(() => Ticket, (ticket) => ticket.comments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Index()
  @Column({ name: 'author_id' })
  authorId: number;

  @ManyToOne(() => User, (user) => user.comments, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ type: 'text' })
  content: string;

  @OneToMany(() => CommentMention, (mention) => mention.comment)
  mentions: CommentMention[];

  @VersionColumn()
  version: number;
}
