import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateTicketLabelsDto } from '../dto/create-ticket_labels.dto';
import { UpdateTicketLabelsDto } from '../dto/update-ticket_labels.dto';
import { FindTicketLabelsService } from '../services/find-ticket_labels.service';
import { CreateTicketLabelsService } from '../services/create-ticket_labels.service';
import { UpdateTicketLabelsService } from '../services/update-ticket_labels.service';
import { DeleteTicketLabelsService } from '../services/delete-ticket_labels.service';

@Controller('ticket-labels')
@UseGuards(JwtAuthGuard)
export class TicketLabelsController {
  constructor(
    private readonly findService: FindTicketLabelsService,
    private readonly createService: CreateTicketLabelsService,
    private readonly updateService: UpdateTicketLabelsService,
    private readonly deleteService: DeleteTicketLabelsService,
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
  async create(@Body() dto: CreateTicketLabelsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTicketLabelsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
