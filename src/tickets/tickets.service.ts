import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async create(input: CreateTicketDto): Promise<Ticket> {
    await this.projectsService.findById(input.projectId);
    await this.validateAssignee(input.assigneeId);

    const ticket = this.ticketsRepository.create({
      ...input,
      assigneeId: input.assigneeId ?? null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
    });

    return this.ticketsRepository.save(ticket);
  }

  async update(id: number, input: UpdateTicketDto): Promise<void> {
    const ticket = await this.findById(id);

    if (input.title !== undefined) {
      ticket.title = input.title;
    }

    if (input.description !== undefined) {
      ticket.description = input.description;
    }

    if (input.status !== undefined) {
      ticket.status = input.status;
    }

    if (input.priority !== undefined) {
      ticket.priority = input.priority;
    }

    if (Object.prototype.hasOwnProperty.call(input, 'assigneeId')) {
      await this.validateAssignee(input.assigneeId);
      ticket.assigneeId = input.assigneeId ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(input, 'dueDate')) {
      ticket.dueDate = input.dueDate ? new Date(input.dueDate) : null;
    }

    await this.ticketsRepository.save(ticket);
  }

  async softDelete(id: number): Promise<void> {
    const result = await this.ticketsRepository.softDelete(id);

    if (!result.affected) {
      throw new NotFoundException(`Ticket ${id} was not found`);
    }
  }

  private async validateAssignee(assigneeId?: number | null): Promise<void> {
    if (assigneeId === undefined || assigneeId === null) {
      return;
    }

    await this.usersService.findById(assigneeId);
  }
}
