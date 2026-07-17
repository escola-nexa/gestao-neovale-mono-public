import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialEntriesDto } from './create-financial_entries.dto';

export class UpdateFinancialEntriesDto extends PartialType(CreateFinancialEntriesDto) {}
