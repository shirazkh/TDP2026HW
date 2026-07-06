import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CommentMention } from '../comments/comment-mention.entity';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditActor } from '../common/enums/audit-actor.enum';
import { AuditEntityType } from '../common/enums/audit-entity-type.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { RequestUser } from '../common/interfaces/request-user.interface';
import {
  BCRYPT_SALT_ROUNDS,
  DEFAULT_USER_PASSWORD,
} from './user-password.constants';
import { User } from './user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

export interface CreateUserInput {
  username: string;
  email: string;
  fullName: string;
  role: User['role'];
  password?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(CommentMention)
    private readonly commentMentionsRepository: Repository<CommentMention>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(input: CreateUserInput, actor?: RequestUser): Promise<User> {
    const password = await this.hashPassword(input.password);
    const user = this.usersRepository.create({
      ...input,
      password,
    });

    const savedUser = await this.usersRepository.save(user);

    await this.auditLogsService.record({
      action: AuditAction.CREATE,
      entityType: AuditEntityType.USER,
      entityId: savedUser.id,
      actor: actor ? AuditActor.USER : AuditActor.SYSTEM,
      performedById: actor?.id ?? null,
      metadata: { username: savedUser.username },
    });

    return savedUser;
  }

  findAll(): Promise<User[]> {
    return this.usersRepository.find({
      order: { id: 'ASC' },
    });
  }

  findDevelopers(): Promise<User[]> {
    return this.usersRepository.find({
      where: { role: UserRole.DEVELOPER },
      order: { id: 'ASC' },
    });
  }

  async findById(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User ${id} was not found`);
    }

    return user;
  }

  async findByUsernamesCaseInsensitive(usernames: string[]): Promise<User[]> {
    if (usernames.length === 0) {
      return [];
    }

    return this.usersRepository
      .createQueryBuilder('user')
      .where('LOWER(user.username) IN (:...usernames)', {
        usernames: usernames.map((username) => username.toLowerCase()),
      })
      .orderBy('user.id', 'ASC')
      .getMany();
  }

  async findMentionedComments(userId: number): Promise<CommentMention[]> {
    await this.findById(userId);

    return this.commentMentionsRepository.find({
      where: { user: { id: userId } },
      relations: {
        comment: {
          mentions: {
            user: true,
          },
        },
        user: true,
      },
      order: {
        comment: {
          createdAt: 'DESC',
        },
      },
    });
  }

  async update(
    id: number,
    input: UpdateUserDto,
    actor: RequestUser,
  ): Promise<void> {
    const user = await this.findById(id);

    if (input.fullName !== undefined) {
      user.fullName = input.fullName;
    }

    if (input.role !== undefined) {
      user.role = input.role;
    }

    await this.usersRepository.save(user);

    await this.auditLogsService.record({
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.USER,
      entityId: id,
      actor: AuditActor.USER,
      performedById: actor.id,
      metadata: { updatedFields: Object.keys(input) },
    });
  }

  async remove(id: number, actor: RequestUser): Promise<void> {
    await this.findById(id);
    await this.auditLogsService.record({
      action: AuditAction.DELETE,
      entityType: AuditEntityType.USER,
      entityId: id,
      actor: AuditActor.USER,
      performedById: actor.id,
    });

    const result = await this.usersRepository.delete(id);

    if (!result.affected) {
      throw new NotFoundException(`User ${id} was not found`);
    }
  }

  async findByUsernameWithPassword(username: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.username = :username', { username })
      .getOne();
  }

  toRequestUser(user: User): RequestUser {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }

  private async hashPassword(password?: string): Promise<string> {
    return bcrypt.hash(password ?? DEFAULT_USER_PASSWORD, BCRYPT_SALT_ROUNDS);
  }
}
