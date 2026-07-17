import { PartialType } from '@nestjs/mapped-types';
import { CreateHrHiringDocumentsDto } from './create-hr_hiring_documents.dto';

export class UpdateHrHiringDocumentsDto extends PartialType(CreateHrHiringDocumentsDto) {}
