import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialPaymentBatchItemsDto } from './create-financial_payment_batch_items.dto';

export class UpdateFinancialPaymentBatchItemsDto extends PartialType(CreateFinancialPaymentBatchItemsDto) {}
