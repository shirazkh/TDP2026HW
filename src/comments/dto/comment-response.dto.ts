import { Comment } from '../comment.entity';

export interface CommentResponseDto {
  id: number;
  ticketId: number;
  authorId: number;
  content: string;
  version: number;
}

export const toCommentResponse = (comment: Comment): CommentResponseDto => ({
  id: comment.id,
  ticketId: comment.ticketId,
  authorId: comment.authorId,
  content: comment.content,
  version: comment.version,
});
