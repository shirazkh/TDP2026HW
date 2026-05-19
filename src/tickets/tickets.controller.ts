import {
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
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { CreateTicketDto } from './dto/create-ticket.dto';
import {
  TicketResponseDto,
  toTicketResponse,
} from './dto/ticket-response.dto';
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
}
