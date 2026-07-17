import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialBudgetsDto } from '../dto/create-financial_budgets.dto';
import { UpdateFinancialBudgetsDto } from '../dto/update-financial_budgets.dto';
import { FindFinancialBudgetsService } from '../services/find-financial_budgets.service';
import { CreateFinancialBudgetsService } from '../services/create-financial_budgets.service';
import { UpdateFinancialBudgetsService } from '../services/update-financial_budgets.service';
import { DeleteFinancialBudgetsService } from '../services/delete-financial_budgets.service';

@Controller('financial-budgets')
@UseGuards(JwtAuthGuard)
export class FinancialBudgetsController {
  constructor(
    private readonly findService: FindFinancialBudgetsService,
    private readonly createService: CreateFinancialBudgetsService,
    private readonly updateService: UpdateFinancialBudgetsService,
    private readonly deleteService: DeleteFinancialBudgetsService,
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
  async create(@Body() dto: CreateFinancialBudgetsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialBudgetsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
