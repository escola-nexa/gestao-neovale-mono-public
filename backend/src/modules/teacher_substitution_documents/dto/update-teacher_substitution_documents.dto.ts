import { PartialType } from '@nestjs/mapped-types';
import { CreateTeacherSubstitutionDocumentsDto } from './create-teacher_substitution_documents.dto';

export class UpdateTeacherSubstitutionDocumentsDto extends PartialType(CreateTeacherSubstitutionDocumentsDto) {}
