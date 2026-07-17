import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialCostCentersDto } from '../dto/create-financial_cost_centers.dto';
import { UpdateFinancialCostCentersDto } from '../dto/update-financial_cost_centers.dto';
import { FindFinancialCostCentersService } from '../services/find-financial_cost_centers.service';
import { CreateFinancialCostCentersService } from '../services/create-financial_cost_centers.service';
import { UpdateFinancialCostCentersService } from '../services/update-financial_cost_centers.service';
import { DeleteFinancialCostCentersService } from '../services/delete-financial_cost_centers.service';

@Controller('financial-cost-centers')
@UseGuards(JwtAuthGuard)
export class FinancialCostCentersController {
  constructor(
    private readonly findService: FindFinancialCostCentersService,
    private readonly createService: CreateFinancialCostCentersService,
    private readonly updateService: UpdateFinancialCostCentersService,
    private readonly deleteService: DeleteFinancialCostCentersService,
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
  async create(@Body() dto: CreateFinancialCostCentersDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialCostCentersDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
