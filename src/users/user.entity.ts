import * as bcrypt from 'bcrypt';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  Index,
  OneToMany,
} from 'typeorm';
import { AuditLog } from '../audit-logs/audit-log.entity';
import { IssueFlowBaseEntity } from '../common/entities/base.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { Comment } from '../comments/comment.entity';
import { Project } from '../projects/project.entity';
import { Ticket } from '../tickets/ticket.entity';
import {
  BCRYPT_SALT_ROUNDS,
  DEFAULT_USER_PASSWORD,
  DEFAULT_USER_PASSWORD_HASH,
} from './user-password.constants';

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$.{53}$/;

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
    default: DEFAULT_USER_PASSWORD_HASH,
    select: false,
  })
  password: string;

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

  @BeforeInsert()
  async hashPasswordBeforeInsert() {
    if (!this.password) {
      this.password = DEFAULT_USER_PASSWORD;
    }

    if (!BCRYPT_HASH_PATTERN.test(this.password)) {
      this.password = await bcrypt.hash(this.password, BCRYPT_SALT_ROUNDS);
    }
  }

  @BeforeUpdate()
  async hashPasswordBeforeUpdate() {
    if (this.password && !BCRYPT_HASH_PATTERN.test(this.password)) {
      this.password = await bcrypt.hash(this.password, BCRYPT_SALT_ROUNDS);
    }
  }
}
