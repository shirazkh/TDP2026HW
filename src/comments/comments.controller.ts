import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { CommentsService } from './comments.service';
import {
  CommentResponseDto,
  toCommentResponse,
} from './dto/comment-response.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Controller('tickets/:ticketId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  async findByTicket(
    @Param('ticketId', ParseIntPipe) ticketId: number,
  ): Promise<CommentResponseDto[]> {
    const comments = await this.commentsService.findByTicket(ticketId);

    return comments.map(toCommentResponse);
  }

  @Post()
  async create(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() createCommentDto: CreateCommentDto,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<CommentResponseDto> {
    const comment = await this.commentsService.create(
      ticketId,
      createCommentDto,
      currentUser,
    );

    return toCommentResponse(comment);
  }

  @Patch(':commentId')
  @HttpCode(200)
  update(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() updateCommentDto: UpdateCommentDto,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<void> {
    return this.commentsService.update(
      ticketId,
      commentId,
      updateCommentDto,
      currentUser,
    );
  }

  @Delete(':commentId')
  @HttpCode(200)
  remove(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<void> {
    return this.commentsService.remove(ticketId, commentId, currentUser);
  }
}
