import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialPaymentBatches } from './entities/financial_payment_batches.entity';
import { FinancialPaymentBatchesController } from './controllers/financial_payment_batches.controller';
import { FindFinancialPaymentBatchesService } from './services/find-financial_payment_batches.service';
import { CreateFinancialPaymentBatchesService } from './services/create-financial_payment_batches.service';
import { UpdateFinancialPaymentBatchesService } from './services/update-financial_payment_batches.service';
import { DeleteFinancialPaymentBatchesService } from './services/delete-financial_payment_batches.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialPaymentBatches])],
  controllers: [FinancialPaymentBatchesController],
  providers: [
    FindFinancialPaymentBatchesService,
    CreateFinancialPaymentBatchesService,
    UpdateFinancialPaymentBatchesService,
    DeleteFinancialPaymentBatchesService,
  ],
  exports: [FindFinancialPaymentBatchesService],
})
export class FinancialPaymentBatchesModule {}
