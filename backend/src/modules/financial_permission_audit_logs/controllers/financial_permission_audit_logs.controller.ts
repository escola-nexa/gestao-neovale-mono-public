import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialPermissionAuditLogsDto } from '../dto/create-financial_permission_audit_logs.dto';
import { UpdateFinancialPermissionAuditLogsDto } from '../dto/update-financial_permission_audit_logs.dto';
import { FindFinancialPermissionAuditLogsService } from '../services/find-financial_permission_audit_logs.service';
import { CreateFinancialPermissionAuditLogsService } from '../services/create-financial_permission_audit_logs.service';
import { UpdateFinancialPermissionAuditLogsService } from '../services/update-financial_permission_audit_logs.service';
import { DeleteFinancialPermissionAuditLogsService } from '../services/delete-financial_permission_audit_logs.service';

@Controller('financial-permission-audit-logs')
@UseGuards(JwtAuthGuard)
export class FinancialPermissionAuditLogsController {
  constructor(
    private readonly findService: FindFinancialPermissionAuditLogsService,
    private readonly createService: CreateFinancialPermissionAuditLogsService,
    private readonly updateService: UpdateFinancialPermissionAuditLogsService,
    private readonly deleteService: DeleteFinancialPermissionAuditLogsService,
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
  async create(@Body() dto: CreateFinancialPermissionAuditLogsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialPermissionAuditLogsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
