import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialBudgetLinesDto } from './create-financial_budget_lines.dto';

export class UpdateFinancialBudgetLinesDto extends PartialType(CreateFinancialBudgetLinesDto) {}
