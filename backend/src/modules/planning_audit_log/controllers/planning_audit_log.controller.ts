import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreatePlanningAuditLogDto } from '../dto/create-planning_audit_log.dto';
import { UpdatePlanningAuditLogDto } from '../dto/update-planning_audit_log.dto';
import { FindPlanningAuditLogService } from '../services/find-planning_audit_log.service';
import { CreatePlanningAuditLogService } from '../services/create-planning_audit_log.service';
import { UpdatePlanningAuditLogService } from '../services/update-planning_audit_log.service';
import { DeletePlanningAuditLogService } from '../services/delete-planning_audit_log.service';

@Controller('planning-audit-log')
@UseGuards(JwtAuthGuard)
export class PlanningAuditLogController {
  constructor(
    private readonly findService: FindPlanningAuditLogService,
    private readonly createService: CreatePlanningAuditLogService,
    private readonly updateService: UpdatePlanningAuditLogService,
    private readonly deleteService: DeletePlanningAuditLogService,
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
  async create(@Body() dto: CreatePlanningAuditLogDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePlanningAuditLogDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
