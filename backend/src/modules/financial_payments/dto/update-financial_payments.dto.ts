import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialPaymentsDto } from './create-financial_payments.dto';

export class UpdateFinancialPaymentsDto extends PartialType(CreateFinancialPaymentsDto) {}
