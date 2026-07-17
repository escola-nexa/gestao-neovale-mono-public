import { PartialType } from '@nestjs/mapped-types';
import { CreateProfessorDocumentsDto } from './create-professor_documents.dto';

export class UpdateProfessorDocumentsDto extends PartialType(CreateProfessorDocumentsDto) {}
