import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialPartyBankHistory } from './entities/financial_party_bank_history.entity';
import { FinancialPartyBankHistoryController } from './controllers/financial_party_bank_history.controller';
import { FindFinancialPartyBankHistoryService } from './services/find-financial_party_bank_history.service';
import { CreateFinancialPartyBankHistoryService } from './services/create-financial_party_bank_history.service';
import { UpdateFinancialPartyBankHistoryService } from './services/update-financial_party_bank_history.service';
import { DeleteFinancialPartyBankHistoryService } from './services/delete-financial_party_bank_history.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialPartyBankHistory])],
  controllers: [FinancialPartyBankHistoryController],
  providers: [
    FindFinancialPartyBankHistoryService,
    CreateFinancialPartyBankHistoryService,
    UpdateFinancialPartyBankHistoryService,
    DeleteFinancialPartyBankHistoryService,
  ],
  exports: [FindFinancialPartyBankHistoryService],
})
export class FinancialPartyBankHistoryModule {}
