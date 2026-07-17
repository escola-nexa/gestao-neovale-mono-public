import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialBudgetsDto } from './create-financial_budgets.dto';

export class UpdateFinancialBudgetsDto extends PartialType(CreateFinancialBudgetsDto) {}
