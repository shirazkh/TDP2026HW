import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { IssueFlowBaseEntity } from '../common/entities/base.entity';
import { Ticket } from './ticket.entity';

@Entity('ticket_dependencies')
@Unique(['ticketId', 'blockedByTicketId'])
export class TicketDependency extends IssueFlowBaseEntity {
  @Index()
  @Column({ name: 'ticket_id' })
  ticketId: number;

  @ManyToOne(() => Ticket, (ticket) => ticket.dependencies, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Index()
  @Column({ name: 'blocked_by_ticket_id' })
  blockedByTicketId: number;

  @ManyToOne(() => Ticket, (ticket) => ticket.blockedTickets, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'blocked_by_ticket_id' })
  blockedByTicket: Ticket;
}
