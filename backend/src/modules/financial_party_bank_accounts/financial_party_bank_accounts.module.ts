import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialPartyBankAccounts } from './entities/financial_party_bank_accounts.entity';
import { FinancialPartyBankAccountsController } from './controllers/financial_party_bank_accounts.controller';
import { FindFinancialPartyBankAccountsService } from './services/find-financial_party_bank_accounts.service';
import { CreateFinancialPartyBankAccountsService } from './services/create-financial_party_bank_accounts.service';
import { UpdateFinancialPartyBankAccountsService } from './services/update-financial_party_bank_accounts.service';
import { DeleteFinancialPartyBankAccountsService } from './services/delete-financial_party_bank_accounts.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialPartyBankAccounts])],
  controllers: [FinancialPartyBankAccountsController],
  providers: [
    FindFinancialPartyBankAccountsService,
    CreateFinancialPartyBankAccountsService,
    UpdateFinancialPartyBankAccountsService,
    DeleteFinancialPartyBankAccountsService,
  ],
  exports: [FindFinancialPartyBankAccountsService],
})
export class FinancialPartyBankAccountsModule {}
