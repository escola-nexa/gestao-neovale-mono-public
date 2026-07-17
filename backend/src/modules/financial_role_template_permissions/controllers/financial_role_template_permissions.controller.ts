import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialRoleTemplatePermissionsDto } from '../dto/create-financial_role_template_permissions.dto';
import { UpdateFinancialRoleTemplatePermissionsDto } from '../dto/update-financial_role_template_permissions.dto';
import { FindFinancialRoleTemplatePermissionsService } from '../services/find-financial_role_template_permissions.service';
import { CreateFinancialRoleTemplatePermissionsService } from '../services/create-financial_role_template_permissions.service';
import { UpdateFinancialRoleTemplatePermissionsService } from '../services/update-financial_role_template_permissions.service';
import { DeleteFinancialRoleTemplatePermissionsService } from '../services/delete-financial_role_template_permissions.service';

@Controller('financial-role-template-permissions')
@UseGuards(JwtAuthGuard)
export class FinancialRoleTemplatePermissionsController {
  constructor(
    private readonly findService: FindFinancialRoleTemplatePermissionsService,
    private readonly createService: CreateFinancialRoleTemplatePermissionsService,
    private readonly updateService: UpdateFinancialRoleTemplatePermissionsService,
    private readonly deleteService: DeleteFinancialRoleTemplatePermissionsService,
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
  async create(@Body() dto: CreateFinancialRoleTemplatePermissionsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialRoleTemplatePermissionsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
