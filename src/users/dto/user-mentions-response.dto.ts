import { CommentMention } from '../../comments/comment-mention.entity';

export interface MentionedUserDto {
  id: number;
  username: string;
  fullName: string;
}

export interface UserMentionCommentResponseDto {
  id: number;
  ticketId: number;
  authorId: number;
  content: string;
  mentionedUsers: MentionedUserDto[];
}

export const toUserMentionCommentResponse = (
  mention: CommentMention,
): UserMentionCommentResponseDto => ({
  id: mention.comment.id,
  ticketId: mention.comment.ticketId,
  authorId: mention.comment.authorId,
  content: mention.comment.content,
  mentionedUsers:
    mention.comment.mentions?.map((commentMention) => ({
      id: commentMention.user.id,
      username: commentMention.user.username,
      fullName: commentMention.user.fullName,
    })) ?? [],
});
