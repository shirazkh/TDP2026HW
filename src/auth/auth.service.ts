import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { MoreThan, Repository } from 'typeorm';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { UsersService } from '../users/users.service';
import { JWT_EXPIRES_IN_SECONDS } from './auth.constants';
import { LoginDto } from './dto/login.dto';
import { RevokedToken } from './entities/revoked-token.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    @InjectRepository(RevokedToken)
    private readonly revokedTokensRepository: Repository<RevokedToken>,
  ) {}

  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const user = await this.validateCredentials(
      loginDto.username,
      loginDto.password,
    );
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      tokenType: 'Bearer',
      expiresIn: JWT_EXPIRES_IN_SECONDS,
    };
  }

  async logout(token: string): Promise<void> {
    const decoded = this.jwtService.decode(token) as { exp?: number } | null;
    const expiresAt = new Date(
      (decoded?.exp ?? Math.floor(Date.now() / 1000) + JWT_EXPIRES_IN_SECONDS) *
        1000,
    );
    const tokenHash = this.hashToken(token);

    await this.revokedTokensRepository.upsert(
      { tokenHash, expiresAt },
      ['tokenHash'],
    );
  }

  async isTokenRevoked(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);
    const revokedToken = await this.revokedTokensRepository.findOne({
      where: {
        tokenHash,
        expiresAt: MoreThan(new Date()),
      },
    });

    return revokedToken !== null;
  }

  async getAuthenticatedUser(userId: number): Promise<RequestUser> {
    const user = await this.usersService.findById(userId);

    return this.usersService.toRequestUser(user);
  }

  private async validateCredentials(username: string, password: string) {
    const user = await this.usersService.findByUsernameWithPassword(username);

    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid username or password');
    }

    return user;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
