import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialPeriodClosuresDto } from './create-financial_period_closures.dto';

export class UpdateFinancialPeriodClosuresDto extends PartialType(CreateFinancialPeriodClosuresDto) {}
