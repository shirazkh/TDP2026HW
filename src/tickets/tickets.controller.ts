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
  ): Promise<TicketResponseDto> {
    const ticket = await this.ticketsService.create(createTicketDto);

    return toTicketResponse(ticket);
  }

  @Patch(':ticketId')
  @HttpCode(200)
  update(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() updateTicketDto: UpdateTicketDto,
  ): Promise<void> {
    return this.ticketsService.update(ticketId, updateTicketDto);
  }

  @Delete(':ticketId')
  @HttpCode(200)
  remove(@Param('ticketId', ParseIntPipe) ticketId: number): Promise<void> {
    return this.ticketsService.softDelete(ticketId);
  }
}
