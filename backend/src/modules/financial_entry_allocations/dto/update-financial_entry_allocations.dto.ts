import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialEntryAllocationsDto } from './create-financial_entry_allocations.dto';

export class UpdateFinancialEntryAllocationsDto extends PartialType(CreateFinancialEntryAllocationsDto) {}
