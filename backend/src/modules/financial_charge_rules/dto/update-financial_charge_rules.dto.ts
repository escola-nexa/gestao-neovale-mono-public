import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialChargeRulesDto } from './create-financial_charge_rules.dto';

export class UpdateFinancialChargeRulesDto extends PartialType(CreateFinancialChargeRulesDto) {}
