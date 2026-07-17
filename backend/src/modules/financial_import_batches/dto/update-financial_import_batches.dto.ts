import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialImportBatchesDto } from './create-financial_import_batches.dto';

export class UpdateFinancialImportBatchesDto extends PartialType(CreateFinancialImportBatchesDto) {}
