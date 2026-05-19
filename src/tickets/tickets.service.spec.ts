import { BadRequestException, ConflictException } from '@nestjs/common';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditActor } from '../common/enums/audit-actor.enum';
import { TicketPriority } from '../common/enums/ticket-priority.enum';
import { TicketStatus } from '../common/enums/ticket-status.enum';
import { TicketType } from '../common/enums/ticket-type.enum';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { Ticket } from './ticket.entity';
import { TicketsService } from './tickets.service';

describe('TicketsService', () => {
  const actor: RequestUser = {
    id: 99,
    username: 'admin',
    email: 'admin@example.com',
    fullName: 'Admin User',
    role: 'ADMIN' as RequestUser['role'],
  };

  const createTicket = (overrides: Partial<Ticket> = {}): Ticket =>
    ({
      id: 1,
      title: 'Ticket',
      description: 'Description',
      status: TicketStatus.TODO,
      priority: TicketPriority.MEDIUM,
      type: TicketType.BUG,
      projectId: 1,
      assigneeId: null,
      dueDate: null,
      isOverdue: false,
      version: 3,
      ...overrides,
    }) as Ticket;

  const createService = (ticket: Ticket) => {
    const ticketsRepository = {
      findOne: jest.fn().mockResolvedValue(ticket),
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const ticketDependenciesRepository = {
      find: jest.fn().mockResolvedValue([]),
    };
    const usersService = {
      findById: jest.fn().mockResolvedValue({ id: 2 }),
      findDevelopers: jest.fn().mockResolvedValue([]),
    };
    const auditLogsService = {
      record: jest.fn().mockResolvedValue({}),
    };
    const service = new TicketsService(
      ticketsRepository as any,
      ticketDependenciesRepository as any,
      { findById: jest.fn().mockResolvedValue({ id: 1 }) } as any,
      usersService as any,
      auditLogsService as any,
      { extractUsernames: jest.fn().mockReturnValue([]) } as any,
    );

    return {
      service,
      ticketsRepository,
      ticketDependenciesRepository,
      usersService,
      auditLogsService,
    };
  };

  it('rejects stale ticket update versions with a conflict', async () => {
    const { service } = createService(createTicket({ version: 4 }));

    await expect(
      service.update(
        1,
        { version: 3, title: 'Updated' },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects any modification to a DONE ticket', async () => {
    const { service } = createService(
      createTicket({ status: TicketStatus.DONE }),
    );

    await expect(
      service.update(
        1,
        { version: 3, title: 'Updated' },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects skipped status transitions', async () => {
    const { service } = createService(createTicket());

    await expect(
      service.update(
        1,
        { version: 3, status: TicketStatus.IN_REVIEW },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates by id and version for optimistic locking', async () => {
    const { service, ticketsRepository } = createService(createTicket());

    await service.update(
      1,
      { version: 3, status: TicketStatus.IN_PROGRESS },
      actor,
    );

    expect(ticketsRepository.update).toHaveBeenCalledWith(
      { id: 1, version: 3 },
      { status: TicketStatus.IN_PROGRESS, version: 4 },
    );
  });

  it('rejects DONE transition when unresolved blockers exist', async () => {
    const { service, ticketDependenciesRepository } = createService(
      createTicket({ status: TicketStatus.IN_REVIEW }),
    );
    ticketDependenciesRepository.find.mockResolvedValue([
      {
        blockedByTicketId: 42,
        blockedByTicket: { status: TicketStatus.IN_PROGRESS },
      },
    ]);

    await expect(
      service.update(1, { version: 3, status: TicketStatus.DONE }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('auto-assigns least-loaded developer on IN_PROGRESS transition', async () => {
    const { service, ticketsRepository, usersService, auditLogsService } =
      createService(createTicket());
    usersService.findDevelopers.mockResolvedValue([{ id: 2 }, { id: 3 }]);
    ticketsRepository.find.mockResolvedValue([
      { id: 10, assigneeId: 2 },
      { id: 11, assigneeId: 2 },
    ]);

    await service.update(
      1,
      { version: 3, status: TicketStatus.IN_PROGRESS },
      actor,
    );

    expect(ticketsRepository.update).toHaveBeenCalledWith(
      { id: 1, version: 3 },
      { assigneeId: 3, status: TicketStatus.IN_PROGRESS, version: 4 },
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.AUTO_ASSIGN,
        actor: AuditActor.SYSTEM,
        metadata: expect.objectContaining({ assignedUserId: 3 }),
      }),
    );
  });
});
