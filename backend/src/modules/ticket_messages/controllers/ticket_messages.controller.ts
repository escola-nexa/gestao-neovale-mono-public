import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateTicketMessagesDto } from '../dto/create-ticket_messages.dto';
import { UpdateTicketMessagesDto } from '../dto/update-ticket_messages.dto';
import { FindTicketMessagesService } from '../services/find-ticket_messages.service';
import { CreateTicketMessagesService } from '../services/create-ticket_messages.service';
import { UpdateTicketMessagesService } from '../services/update-ticket_messages.service';
import { DeleteTicketMessagesService } from '../services/delete-ticket_messages.service';

@Controller('ticket-messages')
@UseGuards(JwtAuthGuard)
export class TicketMessagesController {
  constructor(
    private readonly findService: FindTicketMessagesService,
    private readonly createService: CreateTicketMessagesService,
    private readonly updateService: UpdateTicketMessagesService,
    private readonly deleteService: DeleteTicketMessagesService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: any) {
    return this.findService.findAll(user.organizationId || user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.findService.findOne(id, user.organizationId || user.id);
  }

  @Post()
  async create(@Body() dto: CreateTicketMessagesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTicketMessagesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
