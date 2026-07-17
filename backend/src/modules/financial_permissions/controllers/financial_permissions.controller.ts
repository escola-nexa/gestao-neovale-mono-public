import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialPermissionsDto } from '../dto/create-financial_permissions.dto';
import { UpdateFinancialPermissionsDto } from '../dto/update-financial_permissions.dto';
import { FindFinancialPermissionsService } from '../services/find-financial_permissions.service';
import { CreateFinancialPermissionsService } from '../services/create-financial_permissions.service';
import { UpdateFinancialPermissionsService } from '../services/update-financial_permissions.service';
import { DeleteFinancialPermissionsService } from '../services/delete-financial_permissions.service';

@Controller('financial-permissions')
@UseGuards(JwtAuthGuard)
export class FinancialPermissionsController {
  constructor(
    private readonly findService: FindFinancialPermissionsService,
    private readonly createService: CreateFinancialPermissionsService,
    private readonly updateService: UpdateFinancialPermissionsService,
    private readonly deleteService: DeleteFinancialPermissionsService,
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
  async create(@Body() dto: CreateFinancialPermissionsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialPermissionsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
