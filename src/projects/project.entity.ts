import {
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { IssueFlowBaseEntity } from '../common/entities/base.entity';
import { Ticket } from '../tickets/ticket.entity';
import { User } from '../users/user.entity';

@Entity('projects')
export class Project extends IssueFlowBaseEntity {
  @Index({ unique: true })
  @Column({ length: 160 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'owner_id' })
  ownerId: number;

  @ManyToOne(() => User, (user) => user.ownedProjects, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @OneToMany(() => Ticket, (ticket) => ticket.project)
  tickets: Ticket[];

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
