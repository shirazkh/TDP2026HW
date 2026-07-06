import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { MentionParserService } from '../comments/mention-parser.service';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditActor } from '../common/enums/audit-actor.enum';
import { AuditEntityType } from '../common/enums/audit-entity-type.enum';
import { TicketPriority } from '../common/enums/ticket-priority.enum';
import { TicketStatus } from '../common/enums/ticket-status.enum';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { ProjectsService } from '../projects/projects.service';
import { UsersService } from '../users/users.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketDependency } from './ticket-dependency.entity';
import { Ticket } from './ticket.entity';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
    @InjectRepository(TicketDependency)
    private readonly ticketDependenciesRepository: Repository<TicketDependency>,
    private readonly projectsService: ProjectsService,
    private readonly usersService: UsersService,
    private readonly auditLogsService: AuditLogsService,
    private readonly mentionParserService: MentionParserService,
  ) {}

  async findByProject(projectId: number): Promise<Ticket[]> {
    await this.projectsService.findById(projectId);

    return this.ticketsRepository.find({
      where: { projectId },
      order: { id: 'ASC' },
    });
  }

  async findById(id: number): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({ where: { id } });

    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} was not found`);
    }

    return ticket;
  }

  async create(input: CreateTicketDto, actor: RequestUser): Promise<Ticket> {
    await this.projectsService.findById(input.projectId);
    await this.validateAssignee(input.assigneeId);

    const ticket = this.ticketsRepository.create({
      ...input,
      assigneeId: input.assigneeId ?? null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
    });

    const savedTicket = await this.ticketsRepository.save(ticket);

    await this.auditLogsService.record({
      action: AuditAction.CREATE,
      entityType: AuditEntityType.TICKET,
      entityId: savedTicket.id,
      actor: AuditActor.USER,
      performedById: actor.id,
      metadata: {
        projectId: savedTicket.projectId,
        mentionedUsernames: this.mentionParserService.extractUsernames(
          savedTicket.description,
        ),
      },
    });

    return savedTicket;
  }

  async update(
    id: number,
    input: UpdateTicketDto,
    actor: RequestUser,
  ): Promise<void> {
    const ticket = await this.findById(id);

    this.ensureMutable(ticket);
    this.ensureVersionMatches(ticket, input.version);
    this.validateStatusTransition(ticket.status, input.status);
    await this.ensureNoUnresolvedBlockersForDone(ticket, input.status);

    const updatePayload: Partial<Ticket> = {};

    if (input.title !== undefined) {
      updatePayload.title = input.title;
    }

    if (input.description !== undefined) {
      updatePayload.description = input.description;
    }

    if (input.status !== undefined) {
      updatePayload.status = input.status;
    }

    if (input.priority !== undefined) {
      updatePayload.priority = input.priority;
    }

    if (Object.prototype.hasOwnProperty.call(input, 'assigneeId')) {
      await this.validateAssignee(input.assigneeId);
      updatePayload.assigneeId = input.assigneeId ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(input, 'dueDate')) {
      updatePayload.dueDate = input.dueDate ? new Date(input.dueDate) : null;
    }

    const autoAssignedUserId = await this.applyAutoAssignmentIfNeeded(
      ticket,
      updatePayload,
    );

    if (Object.keys(updatePayload).length === 0) {
      return;
    }

    updatePayload.version = input.version + 1;

    const result = await this.ticketsRepository.update(
      { id, version: input.version },
      updatePayload,
    );

    if (!result.affected) {
      throw new ConflictException(
        `Ticket ${id} was modified by another request. Refresh and retry with the latest version.`,
      );
    }

    await this.auditLogsService.record({
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.TICKET,
      entityId: id,
      actor: AuditActor.USER,
      performedById: actor.id,
      metadata: {
        updatedFields: Object.keys(updatePayload).filter(
          (field) => field !== 'version',
        ),
        mentionedUsernames: this.mentionParserService.extractUsernames(
          updatePayload.description ?? ticket.description,
        ),
      },
    });

    if (autoAssignedUserId !== null) {
      await this.auditLogsService.record({
        action: AuditAction.AUTO_ASSIGN,
        entityType: AuditEntityType.TICKET,
        entityId: id,
        actor: AuditActor.SYSTEM,
        performedById: null,
        metadata: {
          assignedUserId: autoAssignedUserId,
          reason: 'Ticket transitioned to IN_PROGRESS without an assignee',
        },
      });
    }
  }

  async softDelete(id: number, actor: RequestUser): Promise<void> {
    const ticket = await this.findById(id);
    this.ensureMutable(ticket);

    const result = await this.ticketsRepository.softDelete(id);

    if (!result.affected) {
      throw new NotFoundException(`Ticket ${id} was not found`);
    }

    await this.auditLogsService.record({
      action: AuditAction.DELETE,
      entityType: AuditEntityType.TICKET,
      entityId: id,
      actor: AuditActor.USER,
      performedById: actor.id,
      metadata: { projectId: ticket.projectId },
    });
  }

  private async validateAssignee(assigneeId?: number | null): Promise<void> {
    if (assigneeId === undefined || assigneeId === null) {
      return;
    }

    await this.usersService.findById(assigneeId);
  }

  private ensureMutable(ticket: Ticket): void {
    if (ticket.status === TicketStatus.DONE) {
      throw new BadRequestException(
        `Ticket ${ticket.id} is DONE and cannot be modified`,
      );
    }
  }

  private ensureVersionMatches(ticket: Ticket, expectedVersion: number): void {
    if (ticket.version !== expectedVersion) {
      throw new ConflictException(
        `Ticket ${ticket.id} was modified by another request. Expected version ${expectedVersion}, current version ${ticket.version}.`,
      );
    }
  }

  private validateStatusTransition(
    currentStatus: TicketStatus,
    nextStatus?: TicketStatus,
  ): void {
    if (nextStatus === undefined || nextStatus === currentStatus) {
      return;
    }

    const statusOrder = [
      TicketStatus.TODO,
      TicketStatus.IN_PROGRESS,
      TicketStatus.IN_REVIEW,
      TicketStatus.DONE,
    ];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const nextIndex = statusOrder.indexOf(nextStatus);

    if (nextIndex !== currentIndex + 1) {
      throw new BadRequestException(
        `Invalid ticket status transition from ${currentStatus} to ${nextStatus}`,
      );
    }
  }

  private async ensureNoUnresolvedBlockersForDone(
    ticket: Ticket,
    nextStatus?: TicketStatus,
  ): Promise<void> {
    if (nextStatus !== TicketStatus.DONE) {
      return;
    }

    const dependencies = await this.ticketDependenciesRepository.find({
      where: { ticketId: ticket.id },
      relations: { blockedByTicket: true },
    });
    const unresolvedBlockers = dependencies.filter(
      (dependency) =>
        dependency.blockedByTicket &&
        dependency.blockedByTicket.status !== TicketStatus.DONE,
    );

    if (unresolvedBlockers.length > 0) {
      throw new BadRequestException(
        `Ticket ${ticket.id} cannot transition to DONE while blocked by unresolved tickets: ${unresolvedBlockers
          .map((dependency) => dependency.blockedByTicketId)
          .join(', ')}`,
      );
    }
  }

  private async applyAutoAssignmentIfNeeded(
    ticket: Ticket,
    updatePayload: Partial<Ticket>,
  ): Promise<number | null> {
    if (
      updatePayload.status !== TicketStatus.IN_PROGRESS ||
      (updatePayload.assigneeId ?? ticket.assigneeId) !== null
    ) {
      return null;
    }

    const assigneeId = await this.findLeastLoadedDeveloperId(ticket.projectId);

    if (assigneeId === null) {
      return null;
    }

    updatePayload.assigneeId = assigneeId;

    return assigneeId;
  }

  private async findLeastLoadedDeveloperId(
    projectId: number,
  ): Promise<number | null> {
    const developers = await this.usersService.findDevelopers();

    if (developers.length === 0) {
      return null;
    }

    const developerIds = developers.map((developer) => developer.id);
    const activeTickets = await this.ticketsRepository.find({
      where: {
        projectId,
        assigneeId: In(developerIds),
        status: Not(TicketStatus.DONE),
      },
      select: {
        id: true,
        assigneeId: true,
      },
    });
    const workloadByDeveloperId = new Map<number, number>();

    for (const developer of developers) {
      workloadByDeveloperId.set(developer.id, 0);
    }

    for (const activeTicket of activeTickets) {
      if (activeTicket.assigneeId !== null) {
        workloadByDeveloperId.set(
          activeTicket.assigneeId,
          (workloadByDeveloperId.get(activeTicket.assigneeId) ?? 0) + 1,
        );
      }
    }

    return developers.reduce((leastLoadedDeveloper, developer) => {
      const currentWorkload = workloadByDeveloperId.get(developer.id) ?? 0;
      const leastWorkload =
        workloadByDeveloperId.get(leastLoadedDeveloper.id) ?? 0;

      if (currentWorkload < leastWorkload) {
        return developer;
      }

      return leastLoadedDeveloper;
    }).id;
  }

  getNextEscalatedPriority(priority: TicketPriority): TicketPriority {
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
