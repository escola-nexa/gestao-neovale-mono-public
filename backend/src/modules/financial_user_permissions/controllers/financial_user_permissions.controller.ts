import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialUserPermissionsDto } from '../dto/create-financial_user_permissions.dto';
import { UpdateFinancialUserPermissionsDto } from '../dto/update-financial_user_permissions.dto';
import { FindFinancialUserPermissionsService } from '../services/find-financial_user_permissions.service';
import { CreateFinancialUserPermissionsService } from '../services/create-financial_user_permissions.service';
import { UpdateFinancialUserPermissionsService } from '../services/update-financial_user_permissions.service';
import { DeleteFinancialUserPermissionsService } from '../services/delete-financial_user_permissions.service';

@Controller('financial-user-permissions')
@UseGuards(JwtAuthGuard)
export class FinancialUserPermissionsController {
  constructor(
    private readonly findService: FindFinancialUserPermissionsService,
    private readonly createService: CreateFinancialUserPermissionsService,
    private readonly updateService: UpdateFinancialUserPermissionsService,
    private readonly deleteService: DeleteFinancialUserPermissionsService,
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
  async create(@Body() dto: CreateFinancialUserPermissionsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialUserPermissionsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
