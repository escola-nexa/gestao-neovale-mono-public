import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialInstallments } from './entities/financial_installments.entity';
import { FinancialInstallmentsController } from './controllers/financial_installments.controller';
import { FindFinancialInstallmentsService } from './services/find-financial_installments.service';
import { CreateFinancialInstallmentsService } from './services/create-financial_installments.service';
import { UpdateFinancialInstallmentsService } from './services/update-financial_installments.service';
import { DeleteFinancialInstallmentsService } from './services/delete-financial_installments.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialInstallments])],
  controllers: [FinancialInstallmentsController],
  providers: [
    FindFinancialInstallmentsService,
    CreateFinancialInstallmentsService,
    UpdateFinancialInstallmentsService,
    DeleteFinancialInstallmentsService,
  ],
  exports: [FindFinancialInstallmentsService],
})
export class FinancialInstallmentsModule {}
