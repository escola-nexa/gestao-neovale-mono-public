import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateHrHiringAuditLogsDto } from '../dto/create-hr_hiring_audit_logs.dto';
import { UpdateHrHiringAuditLogsDto } from '../dto/update-hr_hiring_audit_logs.dto';
import { FindHrHiringAuditLogsService } from '../services/find-hr_hiring_audit_logs.service';
import { CreateHrHiringAuditLogsService } from '../services/create-hr_hiring_audit_logs.service';
import { UpdateHrHiringAuditLogsService } from '../services/update-hr_hiring_audit_logs.service';
import { DeleteHrHiringAuditLogsService } from '../services/delete-hr_hiring_audit_logs.service';

@Controller('hr-hiring-audit-logs')
@UseGuards(JwtAuthGuard)
export class HrHiringAuditLogsController {
  constructor(
    private readonly findService: FindHrHiringAuditLogsService,
    private readonly createService: CreateHrHiringAuditLogsService,
    private readonly updateService: UpdateHrHiringAuditLogsService,
    private readonly deleteService: DeleteHrHiringAuditLogsService,
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
  async create(@Body() dto: CreateHrHiringAuditLogsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateHrHiringAuditLogsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
