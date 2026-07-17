import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { FinanceiroService } from '../services/financeiro.service';

@Controller('financeiro/budgets')
@UseGuards(JwtAuthGuard)
export class FinanceiroBudgetsController {
  constructor(private readonly finService: FinanceiroService) {}

  @Get()
  async getBudgets(@Query('organizationId') orgId: string) {
    return this.finService.getBudgets(orgId);
  }

  @Post()
  async createBudget(@Body() body: any) {
    return this.finService.createBudget(body);
  }

  @Get(':id')
  async getBudgetById(@Param('id') id: string) {
    return this.finService.getBudgetById(id);
  }

  @Put(':id')
  async updateBudget(@Param('id') id: string, @Body() body: any) {
    return this.finService.updateBudget(id, body);
  }

  @Delete(':id')
  async deleteBudget(@Param('id') id: string) {
    return this.finService.deleteBudget(id);
  }

  @Get(':id/lines')
  async getBudgetLines(@Param('id') id: string) {
    return this.finService.getBudgetLines(id);
  }

  @Get(':id/consumption')
  async getBudgetConsumption(@Param('id') id: string) {
    return this.finService.getBudgetConsumption(id);
  }

  @Post('lines')
  async createBudgetLine(@Body() body: any) {
    return this.finService.createBudgetLine(body);
  }

  @Put('lines/:id')
  async updateBudgetLine(@Param('id') id: string, @Body() body: any) {
    return this.finService.updateBudgetLine(id, body);
  }

  @Delete('lines/:id')
  async deleteBudgetLine(@Param('id') id: string) {
    return this.finService.deleteBudgetLine(id);
  }
}
