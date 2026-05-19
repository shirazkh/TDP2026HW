import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { AuthService, LoginResponse } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() loginDto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(loginDto);
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() request: Request): Promise<void> {
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new BadRequestException('Bearer token is required');
    }

    await this.authService.logout(token);
  }

  @Get('me')
  me(@CurrentUser() currentUser: RequestUser): RequestUser {
    return currentUser;
  }

  private extractBearerToken(request: Request): string | null {
    const authorization = request.headers.authorization;

    if (!authorization) {
      return null;
    }

    const [type, token] = authorization.split(' ');

    return type === 'Bearer' && token ? token : null;
  }
}
