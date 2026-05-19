import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestUser } from '../common/interfaces/request-user.interface';
import {
  BCRYPT_SALT_ROUNDS,
  DEFAULT_USER_PASSWORD,
} from './user-password.constants';
import { User } from './user.entity';

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
  ) {}

  async create(input: CreateUserInput): Promise<User> {
    const password = await this.hashPassword(input.password);
    const user = this.usersRepository.create({
      ...input,
      password,
    });

    return this.usersRepository.save(user);
  }

  async findById(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User ${id} was not found`);
    }

    return user;
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
