import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { TicketsModule } from '../tickets/tickets.module';
import { UsersModule } from '../users/users.module';
import { Comment } from './comment.entity';
import { CommentMention } from './comment-mention.entity';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { MentionParserService } from './mention-parser.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, CommentMention]),
    AuditLogsModule,
    TicketsModule,
    UsersModule,
  ],
  controllers: [CommentsController],
  providers: [CommentsService, MentionParserService],
  exports: [MentionParserService],
})
export class CommentsModule {}
