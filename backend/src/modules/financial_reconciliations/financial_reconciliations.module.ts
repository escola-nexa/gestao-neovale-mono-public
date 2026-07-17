import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialReconciliations } from './entities/financial_reconciliations.entity';
import { FinancialReconciliationsController } from './controllers/financial_reconciliations.controller';
import { FindFinancialReconciliationsService } from './services/find-financial_reconciliations.service';
import { CreateFinancialReconciliationsService } from './services/create-financial_reconciliations.service';
import { UpdateFinancialReconciliationsService } from './services/update-financial_reconciliations.service';
import { DeleteFinancialReconciliationsService } from './services/delete-financial_reconciliations.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialReconciliations])],
  controllers: [FinancialReconciliationsController],
  providers: [
    FindFinancialReconciliationsService,
    CreateFinancialReconciliationsService,
    UpdateFinancialReconciliationsService,
    DeleteFinancialReconciliationsService,
  ],
  exports: [FindFinancialReconciliationsService],
})
export class FinancialReconciliationsModule {}
