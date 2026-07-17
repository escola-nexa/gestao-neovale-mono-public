import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialPaymentBatchItems } from './entities/financial_payment_batch_items.entity';
import { FinancialPaymentBatchItemsController } from './controllers/financial_payment_batch_items.controller';
import { FindFinancialPaymentBatchItemsService } from './services/find-financial_payment_batch_items.service';
import { CreateFinancialPaymentBatchItemsService } from './services/create-financial_payment_batch_items.service';
import { UpdateFinancialPaymentBatchItemsService } from './services/update-financial_payment_batch_items.service';
import { DeleteFinancialPaymentBatchItemsService } from './services/delete-financial_payment_batch_items.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialPaymentBatchItems])],
  controllers: [FinancialPaymentBatchItemsController],
  providers: [
    FindFinancialPaymentBatchItemsService,
    CreateFinancialPaymentBatchItemsService,
    UpdateFinancialPaymentBatchItemsService,
    DeleteFinancialPaymentBatchItemsService,
  ],
  exports: [FindFinancialPaymentBatchItemsService],
})
export class FinancialPaymentBatchItemsModule {}
