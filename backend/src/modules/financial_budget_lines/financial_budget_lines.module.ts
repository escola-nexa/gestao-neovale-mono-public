import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialBudgetLines } from './entities/financial_budget_lines.entity';
import { FinancialBudgetLinesController } from './controllers/financial_budget_lines.controller';
import { FindFinancialBudgetLinesService } from './services/find-financial_budget_lines.service';
import { CreateFinancialBudgetLinesService } from './services/create-financial_budget_lines.service';
import { UpdateFinancialBudgetLinesService } from './services/update-financial_budget_lines.service';
import { DeleteFinancialBudgetLinesService } from './services/delete-financial_budget_lines.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialBudgetLines])],
  controllers: [FinancialBudgetLinesController],
  providers: [
    FindFinancialBudgetLinesService,
    CreateFinancialBudgetLinesService,
    UpdateFinancialBudgetLinesService,
    DeleteFinancialBudgetLinesService,
  ],
  exports: [FindFinancialBudgetLinesService],
})
export class FinancialBudgetLinesModule {}
