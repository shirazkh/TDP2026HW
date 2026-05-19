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
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
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

  @Post()
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.usersService.create(createUserDto);

    return toUserResponse(user);
  }

  @Post('update/:userId')
  @HttpCode(200)
  update(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<void> {
    return this.usersService.update(userId, updateUserDto);
  }

  @Delete(':userId')
  @HttpCode(200)
  remove(@Param('userId', ParseIntPipe) userId: number): Promise<void> {
    return this.usersService.remove(userId);
  }
}
