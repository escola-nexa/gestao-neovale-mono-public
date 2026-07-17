import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialChargeRulesDto } from '../dto/create-financial_charge_rules.dto';
import { UpdateFinancialChargeRulesDto } from '../dto/update-financial_charge_rules.dto';
import { FindFinancialChargeRulesService } from '../services/find-financial_charge_rules.service';
import { CreateFinancialChargeRulesService } from '../services/create-financial_charge_rules.service';
import { UpdateFinancialChargeRulesService } from '../services/update-financial_charge_rules.service';
import { DeleteFinancialChargeRulesService } from '../services/delete-financial_charge_rules.service';

@Controller('financial-charge-rules')
@UseGuards(JwtAuthGuard)
export class FinancialChargeRulesController {
  constructor(
    private readonly findService: FindFinancialChargeRulesService,
    private readonly createService: CreateFinancialChargeRulesService,
    private readonly updateService: UpdateFinancialChargeRulesService,
    private readonly deleteService: DeleteFinancialChargeRulesService,
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
  async create(@Body() dto: CreateFinancialChargeRulesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialChargeRulesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
