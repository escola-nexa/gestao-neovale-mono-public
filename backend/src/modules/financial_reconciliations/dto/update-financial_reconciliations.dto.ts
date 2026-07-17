import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialReconciliationsDto } from './create-financial_reconciliations.dto';

export class UpdateFinancialReconciliationsDto extends PartialType(CreateFinancialReconciliationsDto) {}
