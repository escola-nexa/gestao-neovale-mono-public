import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialCostCentersDto } from './create-financial_cost_centers.dto';

export class UpdateFinancialCostCentersDto extends PartialType(CreateFinancialCostCentersDto) {}
