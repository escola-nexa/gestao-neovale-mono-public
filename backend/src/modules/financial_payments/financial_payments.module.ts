import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialPayments } from './entities/financial_payments.entity';
import { FinancialPaymentsController } from './controllers/financial_payments.controller';
import { FindFinancialPaymentsService } from './services/find-financial_payments.service';
import { CreateFinancialPaymentsService } from './services/create-financial_payments.service';
import { UpdateFinancialPaymentsService } from './services/update-financial_payments.service';
import { DeleteFinancialPaymentsService } from './services/delete-financial_payments.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialPayments])],
  controllers: [FinancialPaymentsController],
  providers: [
    FindFinancialPaymentsService,
    CreateFinancialPaymentsService,
    UpdateFinancialPaymentsService,
    DeleteFinancialPaymentsService,
  ],
  exports: [FindFinancialPaymentsService],
})
export class FinancialPaymentsModule {}
