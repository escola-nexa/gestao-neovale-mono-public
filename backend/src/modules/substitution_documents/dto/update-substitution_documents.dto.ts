import { PartialType } from '@nestjs/mapped-types';
import { CreateSubstitutionDocumentsDto } from './create-substitution_documents.dto';

export class UpdateSubstitutionDocumentsDto extends PartialType(CreateSubstitutionDocumentsDto) {}
