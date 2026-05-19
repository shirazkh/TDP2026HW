import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditActor } from '../common/enums/audit-actor.enum';
import { AuditEntityType } from '../common/enums/audit-entity-type.enum';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { TicketsService } from '../tickets/tickets.service';
import { UsersService } from '../users/users.service';
import { Comment } from './comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentsRepository: Repository<Comment>,
    private readonly ticketsService: TicketsService,
    private readonly usersService: UsersService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findByTicket(ticketId: number): Promise<Comment[]> {
    await this.ticketsService.findById(ticketId);

    return this.commentsRepository.find({
      where: { ticketId },
      order: { id: 'ASC' },
    });
  }

  async create(
    ticketId: number,
    input: CreateCommentDto,
    actor: RequestUser,
  ): Promise<Comment> {
    await this.ticketsService.findById(ticketId);
    await this.usersService.findById(input.authorId);

    const comment = this.commentsRepository.create({
      ticketId,
      authorId: input.authorId,
      content: input.content,
    });

    const savedComment = await this.commentsRepository.save(comment);

    await this.auditLogsService.record({
      action: AuditAction.CREATE,
      entityType: AuditEntityType.COMMENT,
      entityId: savedComment.id,
      actor: AuditActor.USER,
      performedById: actor.id,
      metadata: { ticketId, authorId: savedComment.authorId },
    });

    return savedComment;
  }

  async update(
    ticketId: number,
    commentId: number,
    input: UpdateCommentDto,
    actor: RequestUser,
  ): Promise<void> {
    const comment = await this.findByTicketAndId(ticketId, commentId);

    if (comment.version !== input.version) {
      throw new ConflictException(
        `Comment ${commentId} was modified by another request. Expected version ${input.version}, current version ${comment.version}.`,
      );
    }

    const result = await this.commentsRepository.update(
      { id: commentId, ticketId, version: input.version },
      { content: input.content },
    );

    if (!result.affected) {
      throw new ConflictException(
        `Comment ${commentId} was modified by another request. Refresh and retry with the latest version.`,
      );
    }

    await this.auditLogsService.record({
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.COMMENT,
      entityId: commentId,
      actor: AuditActor.USER,
      performedById: actor.id,
      metadata: { ticketId, updatedFields: ['content'] },
    });
  }

  async remove(
    ticketId: number,
    commentId: number,
    actor: RequestUser,
  ): Promise<void> {
    await this.findByTicketAndId(ticketId, commentId);
    const result = await this.commentsRepository.delete({
      id: commentId,
      ticketId,
    });

    if (!result.affected) {
      throw new NotFoundException(`Comment ${commentId} was not found`);
    }

    await this.auditLogsService.record({
      action: AuditAction.DELETE,
      entityType: AuditEntityType.COMMENT,
      entityId: commentId,
      actor: AuditActor.USER,
      performedById: actor.id,
      metadata: { ticketId },
    });
  }

  private async findByTicketAndId(
    ticketId: number,
    commentId: number,
  ): Promise<Comment> {
    await this.ticketsService.findById(ticketId);

    const comment = await this.commentsRepository.findOne({
      where: { id: commentId, ticketId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment ${commentId} was not found`);
    }

    return comment;
  }
}
