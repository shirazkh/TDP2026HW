import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { AddTicketDependencyDto } from './dto/add-ticket-dependency.dto';
import { ImportTicketResultDto } from './dto/import-ticket-result.dto';
import {
  TicketResponseDto,
  toTicketResponse,
} from './dto/ticket-response.dto';
import {
  TicketDependencyResponseDto,
  toTicketDependencyResponse,
} from './dto/ticket-dependency-response.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketsService } from './tickets.service';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  async findByProject(
    @Query('projectId', ParseIntPipe) projectId: number,
  ): Promise<TicketResponseDto[]> {
    const tickets = await this.ticketsService.findByProject(projectId);

    return tickets.map(toTicketResponse);
  }

  @Get('deleted')
  @Roles(UserRole.ADMIN)
  async findDeleted(
    @Query('projectId', ParseIntPipe) projectId: number,
  ): Promise<TicketResponseDto[]> {
    const tickets = await this.ticketsService.findDeleted(projectId);

    return tickets.map(toTicketResponse);
  }

  @Get('export')
  async exportCsv(
    @Query('projectId', ParseIntPipe) projectId: number,
    @Res({ passthrough: true }) response: Response,
  ): Promise<string> {
    response.setHeader('Content-Type', 'text/csv');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="tickets-project-${projectId}.csv"`,
    );

    return this.ticketsService.exportCsv(projectId);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  importCsv(
    @Query('projectId') queryProjectId: string | undefined,
    @Body('projectId') bodyProjectId: string | undefined,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<ImportTicketResultDto> {
    const rawProjectId = bodyProjectId ?? queryProjectId;
    const projectId = Number(rawProjectId);

    if (!rawProjectId || Number.isNaN(projectId) || projectId < 1) {
      throw new BadRequestException('projectId form field is required');
    }

    return this.ticketsService.importCsv(
      projectId,
      file,
      currentUser,
    );
  }

  @Get(':ticketId')
  async findOne(
    @Param('ticketId', ParseIntPipe) ticketId: number,
  ): Promise<TicketResponseDto> {
    const ticket = await this.ticketsService.findById(ticketId);

    return toTicketResponse(ticket);
  }

  @Post()
  async create(
    @Body() createTicketDto: CreateTicketDto,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<TicketResponseDto> {
    const ticket = await this.ticketsService.create(createTicketDto, currentUser);

    return toTicketResponse(ticket);
  }

  @Patch(':ticketId')
  @HttpCode(200)
  update(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() updateTicketDto: UpdateTicketDto,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<void> {
    return this.ticketsService.update(ticketId, updateTicketDto, currentUser);
  }

  @Delete(':ticketId')
  @HttpCode(200)
  remove(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<void> {
    return this.ticketsService.softDelete(ticketId, currentUser);
  }

  @Post(':ticketId/restore')
  @Roles(UserRole.ADMIN)
  @HttpCode(200)
  restore(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<void> {
    return this.ticketsService.restore(ticketId, currentUser);
  }

  @Post(':ticketId/dependencies')
  @HttpCode(200)
  addDependency(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() addDependencyDto: AddTicketDependencyDto,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<void> {
    return this.ticketsService.addDependency(
      ticketId,
      addDependencyDto.blockedBy,
      currentUser,
    );
  }

  @Get(':ticketId/dependencies')
  async listDependencies(
    @Param('ticketId', ParseIntPipe) ticketId: number,
  ): Promise<TicketDependencyResponseDto[]> {
    const dependencies = await this.ticketsService.listDependencies(ticketId);

    return dependencies.map(toTicketDependencyResponse);
  }

  @Delete(':ticketId/dependencies/:blockerId')
  @HttpCode(200)
  removeDependency(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Param('blockerId', ParseIntPipe) blockerId: number,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<void> {
    return this.ticketsService.removeDependency(
      ticketId,
      blockerId,
      currentUser,
    );
  }
}
