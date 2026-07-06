import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Not, Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditActor } from '../common/enums/audit-actor.enum';
import { AuditEntityType } from '../common/enums/audit-entity-type.enum';
import { TicketPriority } from '../common/enums/ticket-priority.enum';
import { TicketStatus } from '../common/enums/ticket-status.enum';
import { Ticket } from './ticket.entity';

@Injectable()
export class TicketEscalationService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleScheduledEscalation(): Promise<void> {
    await this.escalateOverdueTickets();
  }

  async escalateOverdueTickets(now = new Date()): Promise<number> {
    const overdueTickets = await this.ticketsRepository.find({
      where: {
        dueDate: LessThan(now),
        status: Not(TicketStatus.DONE),
      },
      order: { id: 'ASC' },
    });
    let updatedCount = 0;

    for (const ticket of overdueTickets) {
      const previousPriority = ticket.priority;
      const nextPriority = this.getNextPriority(ticket.priority);
      const nextIsOverdue = nextPriority === TicketPriority.CRITICAL;
      const shouldUpdate =
        ticket.priority !== nextPriority || ticket.isOverdue !== nextIsOverdue;

      if (!shouldUpdate) {
        continue;
      }

      ticket.priority = nextPriority;
      ticket.isOverdue = nextIsOverdue;

      await this.ticketsRepository.save(ticket);

      await this.auditLogsService.record({
        action: AuditAction.AUTO_ESCALATE,
        entityType: AuditEntityType.TICKET,
        entityId: ticket.id,
        actor: AuditActor.SYSTEM,
        performedById: null,
        metadata: {
          dueDate: ticket.dueDate?.toISOString() ?? null,
          previousPriority,
          nextPriority,
          isOverdue: nextIsOverdue,
          statusUnchanged: ticket.status,
        },
      });

      updatedCount += 1;
    }

    return updatedCount;
  }

  private getNextPriority(priority: TicketPriority): TicketPriority {
    switch (priority) {
      case TicketPriority.LOW:
        return TicketPriority.MEDIUM;
      case TicketPriority.MEDIUM:
        return TicketPriority.HIGH;
      case TicketPriority.HIGH:
        return TicketPriority.CRITICAL;
      case TicketPriority.CRITICAL:
        return TicketPriority.CRITICAL;
    }
  }
}
