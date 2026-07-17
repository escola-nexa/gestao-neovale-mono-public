import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialProjectsDto } from './create-financial_projects.dto';

export class UpdateFinancialProjectsDto extends PartialType(CreateFinancialProjectsDto) {}
