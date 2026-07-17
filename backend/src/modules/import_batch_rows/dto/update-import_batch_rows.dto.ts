import { PartialType } from '@nestjs/mapped-types';
import { CreateImportBatchRowsDto } from './create-import_batch_rows.dto';

export class UpdateImportBatchRowsDto extends PartialType(CreateImportBatchRowsDto) {}
