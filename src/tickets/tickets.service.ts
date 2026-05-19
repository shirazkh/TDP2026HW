import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditActor } from '../common/enums/audit-actor.enum';
import { AuditEntityType } from '../common/enums/audit-entity-type.enum';
import { TicketStatus } from '../common/enums/ticket-status.enum';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { ProjectsService } from '../projects/projects.service';
import { UsersService } from '../users/users.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Ticket } from './ticket.entity';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
    private readonly projectsService: ProjectsService,
    private readonly usersService: UsersService,
    private readonly auditLogsService: AuditLogsService,
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
      metadata: { projectId: savedTicket.projectId },
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

    if (Object.keys(updatePayload).length === 0) {
      return;
    }

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
      metadata: { updatedFields: Object.keys(updatePayload) },
    });
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
}
