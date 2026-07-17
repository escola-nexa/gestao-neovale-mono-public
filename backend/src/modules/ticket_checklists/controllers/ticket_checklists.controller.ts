import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateTicketChecklistsDto } from '../dto/create-ticket_checklists.dto';
import { UpdateTicketChecklistsDto } from '../dto/update-ticket_checklists.dto';
import { FindTicketChecklistsService } from '../services/find-ticket_checklists.service';
import { CreateTicketChecklistsService } from '../services/create-ticket_checklists.service';
import { UpdateTicketChecklistsService } from '../services/update-ticket_checklists.service';
import { DeleteTicketChecklistsService } from '../services/delete-ticket_checklists.service';

@Controller('ticket-checklists')
@UseGuards(JwtAuthGuard)
export class TicketChecklistsController {
  constructor(
    private readonly findService: FindTicketChecklistsService,
    private readonly createService: CreateTicketChecklistsService,
    private readonly updateService: UpdateTicketChecklistsService,
    private readonly deleteService: DeleteTicketChecklistsService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: any) {
    return this.findService.findAll(user.organizationId || user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.findService.findOne(id, user.organizationId || user.id);
  }

  @Get(':id/items')
  async getChecklistItems(@Param('id') id: string) {
    return this.findService.getChecklistItems(id);
  }

  @Post()
  async create(@Body() dto: CreateTicketChecklistsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTicketChecklistsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
