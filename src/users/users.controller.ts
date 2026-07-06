import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  toUserMentionCommentResponse,
  UserMentionCommentResponseDto,
} from './dto/user-mentions-response.dto';
import { toUserResponse, UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.usersService.findAll();

    return users.map(toUserResponse);
  }

  @Get(':userId')
  async findOne(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.findById(userId);

    return toUserResponse(user);
  }

  @Get(':userId/mentions')
  async findMentions(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<UserMentionCommentResponseDto[]> {
    const mentions = await this.usersService.findMentionedComments(userId);

    return mentions.map(toUserMentionCommentResponse);
  }

  @Post()
  async create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.create(createUserDto, currentUser);

    return toUserResponse(user);
  }

  @Post('update/:userId')
  @HttpCode(200)
  update(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<void> {
    return this.usersService.update(userId, updateUserDto, currentUser);
  }

  @Delete(':userId')
  @HttpCode(200)
  remove(
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<void> {
    return this.usersService.remove(userId, currentUser);
  }
}
