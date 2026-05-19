import { TicketPriority } from '../../common/enums/ticket-priority.enum';
import { TicketStatus } from '../../common/enums/ticket-status.enum';
import { TicketType } from '../../common/enums/ticket-type.enum';
import { Ticket } from '../ticket.entity';

export interface TicketResponseDto {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  projectId: number;
  assigneeId: number | null;
  dueDate: string | null;
  isOverdue: boolean;
  version: number;
}

export const toTicketResponse = (ticket: Ticket): TicketResponseDto => ({
  id: ticket.id,
  title: ticket.title,
  description: ticket.description,
  status: ticket.status,
  priority: ticket.priority,
  type: ticket.type,
  projectId: ticket.projectId,
  assigneeId: ticket.assigneeId,
  dueDate: ticket.dueDate ? ticket.dueDate.toISOString() : null,
  isOverdue: ticket.isOverdue,
  version: ticket.version,
});
