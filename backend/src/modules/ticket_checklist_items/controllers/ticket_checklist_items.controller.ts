import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateTicketChecklistItemsDto } from '../dto/create-ticket_checklist_items.dto';
import { UpdateTicketChecklistItemsDto } from '../dto/update-ticket_checklist_items.dto';
import { FindTicketChecklistItemsService } from '../services/find-ticket_checklist_items.service';
import { CreateTicketChecklistItemsService } from '../services/create-ticket_checklist_items.service';
import { UpdateTicketChecklistItemsService } from '../services/update-ticket_checklist_items.service';
import { DeleteTicketChecklistItemsService } from '../services/delete-ticket_checklist_items.service';

@Controller('ticket-checklist-items')
@UseGuards(JwtAuthGuard)
export class TicketChecklistItemsController {
  constructor(
    private readonly findService: FindTicketChecklistItemsService,
    private readonly createService: CreateTicketChecklistItemsService,
    private readonly updateService: UpdateTicketChecklistItemsService,
    private readonly deleteService: DeleteTicketChecklistItemsService,
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
  async create(@Body() dto: CreateTicketChecklistItemsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTicketChecklistItemsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
