import { TicketStatus } from '../../common/enums/ticket-status.enum';
import { Ticket } from '../ticket.entity';

export interface TicketDependencyResponseDto {
  id: number;
  title: string;
  status: TicketStatus;
}

export const toTicketDependencyResponse = (
  ticket: Ticket,
): TicketDependencyResponseDto => ({
  id: ticket.id,
  title: ticket.title,
  status: ticket.status,
});
