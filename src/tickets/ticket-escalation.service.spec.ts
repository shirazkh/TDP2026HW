import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditActor } from '../common/enums/audit-actor.enum';
import { TicketPriority } from '../common/enums/ticket-priority.enum';
import { TicketStatus } from '../common/enums/ticket-status.enum';
import { TicketType } from '../common/enums/ticket-type.enum';
import { Ticket } from './ticket.entity';
import { TicketEscalationService } from './ticket-escalation.service';

describe('TicketEscalationService', () => {
  const createTicket = (overrides: Partial<Ticket> = {}): Ticket =>
    ({
      id: 1,
      title: 'Ticket',
      description: 'Description',
      status: TicketStatus.IN_PROGRESS,
      priority: TicketPriority.MEDIUM,
      type: TicketType.BUG,
      projectId: 1,
      assigneeId: null,
      dueDate: new Date('2026-01-01T00:00:00.000Z'),
      isOverdue: false,
      version: 1,
      ...overrides,
    }) as Ticket;

  it('escalates overdue tickets without changing status', async () => {
    const ticket = createTicket();
    const ticketsRepository = {
      find: jest.fn().mockResolvedValue([ticket]),
      save: jest.fn().mockResolvedValue(ticket),
    };
    const auditLogsService = {
      record: jest.fn().mockResolvedValue({}),
    };
    const service = new TicketEscalationService(
      ticketsRepository as any,
      auditLogsService as any,
    );

    await expect(
      service.escalateOverdueTickets(new Date('2026-01-02T00:00:00.000Z')),
    ).resolves.toBe(1);

    expect(ticket.priority).toBe(TicketPriority.HIGH);
    expect(ticket.status).toBe(TicketStatus.IN_PROGRESS);
    expect(ticket.isOverdue).toBe(false);
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.AUTO_ESCALATE,
        actor: AuditActor.SYSTEM,
        metadata: expect.objectContaining({
          previousPriority: TicketPriority.MEDIUM,
          nextPriority: TicketPriority.HIGH,
          isOverdue: false,
          statusUnchanged: TicketStatus.IN_PROGRESS,
        }),
      }),
    );
  });

  it('sets overdue flag when escalation reaches CRITICAL', async () => {
    const ticket = createTicket({ priority: TicketPriority.HIGH });
    const ticketsRepository = {
      find: jest.fn().mockResolvedValue([ticket]),
      save: jest.fn().mockResolvedValue(ticket),
    };
    const auditLogsService = {
      record: jest.fn().mockResolvedValue({}),
    };
    const service = new TicketEscalationService(
      ticketsRepository as any,
      auditLogsService as any,
    );

    await expect(
      service.escalateOverdueTickets(new Date('2026-01-02T00:00:00.000Z')),
    ).resolves.toBe(1);

    expect(ticket.priority).toBe(TicketPriority.CRITICAL);
    expect(ticket.status).toBe(TicketStatus.IN_PROGRESS);
    expect(ticket.isOverdue).toBe(true);
  });

  it('keeps critical overdue tickets idempotent after overdue flag is set', async () => {
    const ticket = createTicket({
      priority: TicketPriority.CRITICAL,
      isOverdue: true,
    });
    const ticketsRepository = {
      find: jest.fn().mockResolvedValue([ticket]),
      save: jest.fn(),
    };
    const auditLogsService = {
      record: jest.fn(),
    };
    const service = new TicketEscalationService(
      ticketsRepository as any,
      auditLogsService as any,
    );

    await expect(
      service.escalateOverdueTickets(new Date('2026-01-02T00:00:00.000Z')),
    ).resolves.toBe(0);

    expect(ticketsRepository.save).not.toHaveBeenCalled();
    expect(auditLogsService.record).not.toHaveBeenCalled();
  });
});
