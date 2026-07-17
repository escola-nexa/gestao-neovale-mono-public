import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialSettingsAuditDto } from '../dto/create-financial_settings_audit.dto';
import { UpdateFinancialSettingsAuditDto } from '../dto/update-financial_settings_audit.dto';
import { FindFinancialSettingsAuditService } from '../services/find-financial_settings_audit.service';
import { CreateFinancialSettingsAuditService } from '../services/create-financial_settings_audit.service';
import { UpdateFinancialSettingsAuditService } from '../services/update-financial_settings_audit.service';
import { DeleteFinancialSettingsAuditService } from '../services/delete-financial_settings_audit.service';

@Controller('financial-settings-audit')
@UseGuards(JwtAuthGuard)
export class FinancialSettingsAuditController {
  constructor(
    private readonly findService: FindFinancialSettingsAuditService,
    private readonly createService: CreateFinancialSettingsAuditService,
    private readonly updateService: UpdateFinancialSettingsAuditService,
    private readonly deleteService: DeleteFinancialSettingsAuditService,
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
  async create(@Body() dto: CreateFinancialSettingsAuditDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialSettingsAuditDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
