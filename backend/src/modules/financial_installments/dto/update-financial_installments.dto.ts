import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialInstallmentsDto } from './create-financial_installments.dto';

export class UpdateFinancialInstallmentsDto extends PartialType(CreateFinancialInstallmentsDto) {}
