import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialCategoriesDto } from './create-financial_categories.dto';

export class UpdateFinancialCategoriesDto extends PartialType(CreateFinancialCategoriesDto) {}
