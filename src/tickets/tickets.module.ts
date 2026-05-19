import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { MentionParserService } from '../comments/mention-parser.service';
import { ProjectsModule } from '../projects/projects.module';
import { UsersModule } from '../users/users.module';
import { TicketDependency } from './ticket-dependency.entity';
import { Ticket } from './ticket.entity';
import { TicketsController } from './tickets.controller';
import { TicketEscalationService } from './ticket-escalation.service';
import { TicketsService } from './tickets.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, TicketDependency]),
    AuditLogsModule,
    ProjectsModule,
    UsersModule,
  ],
  controllers: [TicketsController],
  providers: [TicketsService, TicketEscalationService, MentionParserService],
  exports: [TicketsService],
})
export class TicketsModule {}
