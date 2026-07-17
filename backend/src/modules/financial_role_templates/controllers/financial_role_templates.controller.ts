import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialRoleTemplatesDto } from '../dto/create-financial_role_templates.dto';
import { UpdateFinancialRoleTemplatesDto } from '../dto/update-financial_role_templates.dto';
import { FindFinancialRoleTemplatesService } from '../services/find-financial_role_templates.service';
import { CreateFinancialRoleTemplatesService } from '../services/create-financial_role_templates.service';
import { UpdateFinancialRoleTemplatesService } from '../services/update-financial_role_templates.service';
import { DeleteFinancialRoleTemplatesService } from '../services/delete-financial_role_templates.service';

@Controller('financial-role-templates')
@UseGuards(JwtAuthGuard)
export class FinancialRoleTemplatesController {
  constructor(
    private readonly findService: FindFinancialRoleTemplatesService,
    private readonly createService: CreateFinancialRoleTemplatesService,
    private readonly updateService: UpdateFinancialRoleTemplatesService,
    private readonly deleteService: DeleteFinancialRoleTemplatesService,
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
  async create(@Body() dto: CreateFinancialRoleTemplatesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialRoleTemplatesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
