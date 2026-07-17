import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateFinancialBudgetLinesDto } from '../dto/create-financial_budget_lines.dto';
import { UpdateFinancialBudgetLinesDto } from '../dto/update-financial_budget_lines.dto';
import { FindFinancialBudgetLinesService } from '../services/find-financial_budget_lines.service';
import { CreateFinancialBudgetLinesService } from '../services/create-financial_budget_lines.service';
import { UpdateFinancialBudgetLinesService } from '../services/update-financial_budget_lines.service';
import { DeleteFinancialBudgetLinesService } from '../services/delete-financial_budget_lines.service';

@Controller('financial-budget-lines')
@UseGuards(JwtAuthGuard)
export class FinancialBudgetLinesController {
  constructor(
    private readonly findService: FindFinancialBudgetLinesService,
    private readonly createService: CreateFinancialBudgetLinesService,
    private readonly updateService: UpdateFinancialBudgetLinesService,
    private readonly deleteService: DeleteFinancialBudgetLinesService,
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
  async create(@Body() dto: CreateFinancialBudgetLinesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFinancialBudgetLinesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
