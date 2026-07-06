import { Comment } from '../comment.entity';

export interface CommentResponseDto {
  id: number;
  ticketId: number;
  authorId: number;
  content: string;
  version: number;
  mentionedUsers: Array<{
    id: number;
    username: string;
    fullName: string;
  }>;
}

export const toCommentResponse = (comment: Comment): CommentResponseDto => ({
  id: comment.id,
  ticketId: comment.ticketId,
  authorId: comment.authorId,
  content: comment.content,
  version: comment.version,
  mentionedUsers:
    comment.mentions?.map((mention) => ({
      id: mention.user.id,
      username: mention.user.username,
      fullName: mention.user.fullName,
    })) ?? [],
});
