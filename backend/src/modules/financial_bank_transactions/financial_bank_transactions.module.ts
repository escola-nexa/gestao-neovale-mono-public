import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialBankTransactions } from './entities/financial_bank_transactions.entity';
import { FinancialBankTransactionsController } from './controllers/financial_bank_transactions.controller';
import { FindFinancialBankTransactionsService } from './services/find-financial_bank_transactions.service';
import { CreateFinancialBankTransactionsService } from './services/create-financial_bank_transactions.service';
import { UpdateFinancialBankTransactionsService } from './services/update-financial_bank_transactions.service';
import { DeleteFinancialBankTransactionsService } from './services/delete-financial_bank_transactions.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialBankTransactions])],
  controllers: [FinancialBankTransactionsController],
  providers: [
    FindFinancialBankTransactionsService,
    CreateFinancialBankTransactionsService,
    UpdateFinancialBankTransactionsService,
    DeleteFinancialBankTransactionsService,
  ],
  exports: [FindFinancialBankTransactionsService],
})
export class FinancialBankTransactionsModule {}
