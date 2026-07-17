import { PartialType } from '@nestjs/mapped-types';
import { CreateImportBatchesDto } from './create-import_batches.dto';

export class UpdateImportBatchesDto extends PartialType(CreateImportBatchesDto) {}
