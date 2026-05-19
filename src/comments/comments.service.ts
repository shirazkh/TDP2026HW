import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  ) {}

  async findByTicket(ticketId: number): Promise<Comment[]> {
    await this.ticketsService.findById(ticketId);

    return this.commentsRepository.find({
      where: { ticketId },
      order: { id: 'ASC' },
    });
  }

  async create(ticketId: number, input: CreateCommentDto): Promise<Comment> {
    await this.ticketsService.findById(ticketId);
    await this.usersService.findById(input.authorId);

    const comment = this.commentsRepository.create({
      ticketId,
      authorId: input.authorId,
      content: input.content,
    });

    return this.commentsRepository.save(comment);
  }

  async update(
    ticketId: number,
    commentId: number,
    input: UpdateCommentDto,
  ): Promise<void> {
    const comment = await this.findByTicketAndId(ticketId, commentId);
    comment.content = input.content;

    await this.commentsRepository.save(comment);
  }

  async remove(ticketId: number, commentId: number): Promise<void> {
    await this.findByTicketAndId(ticketId, commentId);
    const result = await this.commentsRepository.delete({
      id: commentId,
      ticketId,
    });

    if (!result.affected) {
      throw new NotFoundException(`Comment ${commentId} was not found`);
    }
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
