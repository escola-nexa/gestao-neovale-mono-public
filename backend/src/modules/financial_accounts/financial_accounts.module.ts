import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialAccounts } from './entities/financial_accounts.entity';
import { FinancialAccountsController } from './controllers/financial_accounts.controller';
import { FindFinancialAccountsService } from './services/find-financial_accounts.service';
import { CreateFinancialAccountsService } from './services/create-financial_accounts.service';
import { UpdateFinancialAccountsService } from './services/update-financial_accounts.service';
import { DeleteFinancialAccountsService } from './services/delete-financial_accounts.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialAccounts])],
  controllers: [FinancialAccountsController],
  providers: [
    FindFinancialAccountsService,
    CreateFinancialAccountsService,
    UpdateFinancialAccountsService,
    DeleteFinancialAccountsService,
  ],
  exports: [FindFinancialAccountsService],
})
export class FinancialAccountsModule {}
