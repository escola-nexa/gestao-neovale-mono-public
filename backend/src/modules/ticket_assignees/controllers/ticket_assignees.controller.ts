import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateTicketAssigneesDto } from '../dto/create-ticket_assignees.dto';
import { UpdateTicketAssigneesDto } from '../dto/update-ticket_assignees.dto';
import { FindTicketAssigneesService } from '../services/find-ticket_assignees.service';
import { CreateTicketAssigneesService } from '../services/create-ticket_assignees.service';
import { UpdateTicketAssigneesService } from '../services/update-ticket_assignees.service';
import { DeleteTicketAssigneesService } from '../services/delete-ticket_assignees.service';

@Controller('ticket-assignees')
@UseGuards(JwtAuthGuard)
export class TicketAssigneesController {
  constructor(
    private readonly findService: FindTicketAssigneesService,
    private readonly createService: CreateTicketAssigneesService,
    private readonly updateService: UpdateTicketAssigneesService,
    private readonly deleteService: DeleteTicketAssigneesService,
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
  async create(@Body() dto: CreateTicketAssigneesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTicketAssigneesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
