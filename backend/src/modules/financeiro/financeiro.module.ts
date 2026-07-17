import { Module } from '@nestjs/common';
import { FinanceiroService } from './services/financeiro.service';
import { FinanceiroRegistersController } from './controllers/financeiro-registers.controller';
import { FinanceiroBudgetsController } from './controllers/financeiro-budgets.controller';
import { FinanceiroClosuresController } from './controllers/financeiro-closures.controller';
import { FinanceiroTreasuryController } from './controllers/financeiro-treasury.controller';
import { FinanceiroPaymentsController } from './controllers/financeiro-payments.controller';
import { FinanceiroEntriesController } from './controllers/financeiro-entries.controller';
import { FinanceiroReceiptsController } from './controllers/financeiro-receipts.controller';
import { FinanceiroSettingsController } from './controllers/financeiro-settings.controller';

@Module({
  controllers: [
    FinanceiroRegistersController,
    FinanceiroBudgetsController,
    FinanceiroClosuresController,
    FinanceiroTreasuryController,
    FinanceiroPaymentsController,
    FinanceiroEntriesController,
    FinanceiroReceiptsController,
    FinanceiroSettingsController
  ],
  providers: [FinanceiroService],
  exports: [FinanceiroService],
})
export class FinanceiroModule {}
