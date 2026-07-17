import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateTicketLabelAssignmentsDto } from '../dto/create-ticket_label_assignments.dto';
import { UpdateTicketLabelAssignmentsDto } from '../dto/update-ticket_label_assignments.dto';
import { FindTicketLabelAssignmentsService } from '../services/find-ticket_label_assignments.service';
import { CreateTicketLabelAssignmentsService } from '../services/create-ticket_label_assignments.service';
import { UpdateTicketLabelAssignmentsService } from '../services/update-ticket_label_assignments.service';
import { DeleteTicketLabelAssignmentsService } from '../services/delete-ticket_label_assignments.service';

@Controller('ticket-label-assignments')
@UseGuards(JwtAuthGuard)
export class TicketLabelAssignmentsController {
  constructor(
    private readonly findService: FindTicketLabelAssignmentsService,
    private readonly createService: CreateTicketLabelAssignmentsService,
    private readonly updateService: UpdateTicketLabelAssignmentsService,
    private readonly deleteService: DeleteTicketLabelAssignmentsService,
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
  async create(@Body() dto: CreateTicketLabelAssignmentsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTicketLabelAssignmentsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
