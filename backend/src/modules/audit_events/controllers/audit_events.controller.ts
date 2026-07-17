import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateAuditEventsDto } from '../dto/create-audit_events.dto';
import { UpdateAuditEventsDto } from '../dto/update-audit_events.dto';
import { FindAuditEventsService } from '../services/find-audit_events.service';
import { CreateAuditEventsService } from '../services/create-audit_events.service';
import { UpdateAuditEventsService } from '../services/update-audit_events.service';
import { DeleteAuditEventsService } from '../services/delete-audit_events.service';

@Controller('audit-events')
@UseGuards(JwtAuthGuard)
export class AuditEventsController {
  constructor(
    private readonly findService: FindAuditEventsService,
    private readonly createService: CreateAuditEventsService,
    private readonly updateService: UpdateAuditEventsService,
    private readonly deleteService: DeleteAuditEventsService,
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
  async create(@Body() dto: CreateAuditEventsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAuditEventsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
