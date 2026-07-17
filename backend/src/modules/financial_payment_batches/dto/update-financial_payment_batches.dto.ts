import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialPaymentBatchesDto } from './create-financial_payment_batches.dto';

export class UpdateFinancialPaymentBatchesDto extends PartialType(CreateFinancialPaymentBatchesDto) {}
