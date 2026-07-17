import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialSettingsDto } from '../dto/create-financial_settings.dto';
import { UpdateFinancialSettingsDto } from '../dto/update-financial_settings.dto';
import { FindFinancialSettingsService } from '../services/find-financial_settings.service';
import { CreateFinancialSettingsService } from '../services/create-financial_settings.service';
import { UpdateFinancialSettingsService } from '../services/update-financial_settings.service';
import { DeleteFinancialSettingsService } from '../services/delete-financial_settings.service';

@Controller('financial-settings')
@UseGuards(JwtAuthGuard)
export class FinancialSettingsController {
  constructor(
    private readonly findService: FindFinancialSettingsService,
    private readonly createService: CreateFinancialSettingsService,
    private readonly updateService: UpdateFinancialSettingsService,
    private readonly deleteService: DeleteFinancialSettingsService,
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
  async create(@Body() dto: CreateFinancialSettingsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialSettingsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
