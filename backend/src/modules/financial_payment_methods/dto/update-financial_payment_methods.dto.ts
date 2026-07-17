import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialPaymentMethodsDto } from './create-financial_payment_methods.dto';

export class UpdateFinancialPaymentMethodsDto extends PartialType(CreateFinancialPaymentMethodsDto) {}
