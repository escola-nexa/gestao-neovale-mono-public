import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialBudgets } from './entities/financial_budgets.entity';
import { FinancialBudgetsController } from './controllers/financial_budgets.controller';
import { FindFinancialBudgetsService } from './services/find-financial_budgets.service';
import { CreateFinancialBudgetsService } from './services/create-financial_budgets.service';
import { UpdateFinancialBudgetsService } from './services/update-financial_budgets.service';
import { DeleteFinancialBudgetsService } from './services/delete-financial_budgets.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialBudgets])],
  controllers: [FinancialBudgetsController],
  providers: [
    FindFinancialBudgetsService,
    CreateFinancialBudgetsService,
    UpdateFinancialBudgetsService,
    DeleteFinancialBudgetsService,
  ],
  exports: [FindFinancialBudgetsService],
})
export class FinancialBudgetsModule {}
