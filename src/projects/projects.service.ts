import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditActor } from '../common/enums/audit-actor.enum';
import { AuditEntityType } from '../common/enums/audit-entity-type.enum';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { TicketStatus } from '../common/enums/ticket-status.enum';
import { Ticket } from '../tickets/ticket.entity';
import { UsersService } from '../users/users.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectWorkloadResponseDto } from './dto/project-workload-response.dto';
import { Project } from './project.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
    private readonly usersService: UsersService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  findAll(): Promise<Project[]> {
    return this.projectsRepository.find({
      order: { id: 'ASC' },
    });
  }

  async findById(id: number): Promise<Project> {
    const project = await this.projectsRepository.findOne({ where: { id } });

    if (!project) {
      throw new NotFoundException(`Project ${id} was not found`);
    }

    return project;
  }

  findDeleted(): Promise<Project[]> {
    return this.projectsRepository.find({
      withDeleted: true,
      where: {
        deletedAt: Not(IsNull()),
      },
      order: { id: 'ASC' },
    });
  }

  async getWorkload(projectId: number): Promise<ProjectWorkloadResponseDto[]> {
    await this.findById(projectId);
    const developers = await this.usersService.findDevelopers();

    if (developers.length === 0) {
      return [];
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
    const workloadByUserId = new Map<number, number>();

    for (const developer of developers) {
      workloadByUserId.set(developer.id, 0);
    }

    for (const ticket of activeTickets) {
      if (ticket.assigneeId !== null) {
        workloadByUserId.set(
          ticket.assigneeId,
          (workloadByUserId.get(ticket.assigneeId) ?? 0) + 1,
        );
      }
    }

    return developers
      .map((developer) => ({
        userId: developer.id,
        username: developer.username,
        openTicketCount: workloadByUserId.get(developer.id) ?? 0,
      }))
      .sort(
        (left, right) =>
          left.openTicketCount - right.openTicketCount ||
          left.userId - right.userId,
      );
  }

  async create(input: CreateProjectDto, actor: RequestUser): Promise<Project> {
    await this.usersService.findById(input.ownerId);

    const project = this.projectsRepository.create(input);

    const savedProject = await this.projectsRepository.save(project);

    await this.auditLogsService.record({
      action: AuditAction.CREATE,
      entityType: AuditEntityType.PROJECT,
      entityId: savedProject.id,
      actor: AuditActor.USER,
      performedById: actor.id,
      metadata: { ownerId: savedProject.ownerId },
    });

    return savedProject;
  }

  async update(
    id: number,
    input: UpdateProjectDto,
    actor: RequestUser,
  ): Promise<void> {
    const project = await this.findById(id);

    if (input.name !== undefined) {
      project.name = input.name;
    }

    if (input.description !== undefined) {
      project.description = input.description;
    }

    await this.projectsRepository.save(project);

    await this.auditLogsService.record({
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.PROJECT,
      entityId: id,
      actor: AuditActor.USER,
      performedById: actor.id,
      metadata: { updatedFields: Object.keys(input) },
    });
  }

  async softDelete(id: number, actor: RequestUser): Promise<void> {
    const result = await this.projectsRepository.softDelete(id);

    if (!result.affected) {
      throw new NotFoundException(`Project ${id} was not found`);
    }

    await this.auditLogsService.record({
      action: AuditAction.DELETE,
      entityType: AuditEntityType.PROJECT,
      entityId: id,
      actor: AuditActor.USER,
      performedById: actor.id,
    });
  }

  async restore(id: number, actor: RequestUser): Promise<void> {
    const result = await this.projectsRepository.restore(id);

    if (!result.affected) {
      throw new NotFoundException(`Project ${id} was not found`);
    }

    await this.auditLogsService.record({
      action: AuditAction.RESTORE,
      entityType: AuditEntityType.PROJECT,
      entityId: id,
      actor: AuditActor.USER,
      performedById: actor.id,
    });
  }
}
