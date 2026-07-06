import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Ticket } from '../tickets/ticket.entity';

@Entity('attachments')
export class Attachment {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'ticket_id' })
  ticketId: number;

  @ManyToOne(() => Ticket, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column({ length: 255 })
  filename: string;

  @Column({ name: 'content_type', length: 120 })
  contentType: string;

  @Column()
  size: number;

  @Column({ type: 'bytea' })
  data: Buffer;
}
