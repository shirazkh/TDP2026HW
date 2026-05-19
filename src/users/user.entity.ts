import { Column, Entity, Index, OneToMany } from 'typeorm';
import { AuditLog } from '../audit-logs/audit-log.entity';
import { IssueFlowBaseEntity } from '../common/entities/base.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { Comment } from '../comments/comment.entity';
import { Project } from '../projects/project.entity';
import { Ticket } from '../tickets/ticket.entity';

@Entity('users')
export class User extends IssueFlowBaseEntity {
  @Index({ unique: true })
  @Column({ length: 80 })
  username: string;

  @Index({ unique: true })
  @Column({ length: 255 })
  email: string;

  @Column({ name: 'full_name', length: 160 })
  fullName: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.DEVELOPER,
  })
  role: UserRole;

  @OneToMany(() => Project, (project) => project.owner)
  ownedProjects: Project[];

  @OneToMany(() => Ticket, (ticket) => ticket.assignee)
  assignedTickets: Ticket[];

  @OneToMany(() => Comment, (comment) => comment.author)
  comments: Comment[];

  @OneToMany(() => AuditLog, (auditLog) => auditLog.performedBy)
  auditLogs: AuditLog[];
}
