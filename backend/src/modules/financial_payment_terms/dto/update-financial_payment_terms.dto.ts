import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialPaymentTermsDto } from './create-financial_payment_terms.dto';

export class UpdateFinancialPaymentTermsDto extends PartialType(CreateFinancialPaymentTermsDto) {}
