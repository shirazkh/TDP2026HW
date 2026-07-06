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
import { User } from '../users/user.entity';
import { Comment } from './comment.entity';
import { CommentMention } from './comment-mention.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { MentionParserService } from './mention-parser.service';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentsRepository: Repository<Comment>,
    @InjectRepository(CommentMention)
    private readonly commentMentionsRepository: Repository<CommentMention>,
    private readonly ticketsService: TicketsService,
    private readonly usersService: UsersService,
    private readonly auditLogsService: AuditLogsService,
    private readonly mentionParserService: MentionParserService,
  ) {}

  async findByTicket(ticketId: number): Promise<Comment[]> {
    await this.ticketsService.findById(ticketId);

    return this.commentsRepository.find({
      where: { ticketId },
      relations: {
        mentions: {
          user: true,
        },
      },
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
    const mentionedUsers = await this.syncMentions(savedComment, input.content);
    const mentionedUsernames = mentionedUsers.map((user) =>
      user.username.toLowerCase(),
    );

    await this.auditLogsService.record({
      action: AuditAction.CREATE,
      entityType: AuditEntityType.COMMENT,
      entityId: savedComment.id,
      actor: AuditActor.USER,
      performedById: actor.id,
      metadata: {
        ticketId,
        authorId: savedComment.authorId,
        mentionedUsernames,
      },
    });

    return this.findByTicketAndId(ticketId, savedComment.id);
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
      { content: input.content, version: input.version + 1 },
    );

    if (!result.affected) {
      throw new ConflictException(
        `Comment ${commentId} was modified by another request. Refresh and retry with the latest version.`,
      );
    }

    const mentionedUsers = await this.syncMentions(comment, input.content);

    await this.auditLogsService.record({
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.COMMENT,
      entityId: commentId,
      actor: AuditActor.USER,
      performedById: actor.id,
      metadata: {
        ticketId,
        updatedFields: ['content'],
        mentionedUsernames: mentionedUsers.map((user) =>
          user.username.toLowerCase(),
        ),
      },
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
      relations: {
        mentions: {
          user: true,
        },
      },
    });

    if (!comment) {
      throw new NotFoundException(`Comment ${commentId} was not found`);
    }

    return comment;
  }

  private async syncMentions(
    comment: Comment,
    content: string,
  ): Promise<User[]> {
    const mentionedUsernames = this.mentionParserService.extractUsernames(content);
    const mentionedUsers =
      await this.usersService.findByUsernamesCaseInsensitive(mentionedUsernames);

    await this.commentMentionsRepository.delete({
      comment: { id: comment.id },
    });

    if (mentionedUsers.length === 0) {
      return [];
    }

    await this.commentMentionsRepository.save(
      mentionedUsers.map((user) =>
        this.commentMentionsRepository.create({
          comment: { id: comment.id },
          user: { id: user.id },
        }),
      ),
    );

    return mentionedUsers;
  }
}
