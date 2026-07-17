import { PartialType } from '@nestjs/mapped-types';
import { CreateProfessorDocumentFilesDto } from './create-professor_document_files.dto';

export class UpdateProfessorDocumentFilesDto extends PartialType(CreateProfessorDocumentFilesDto) {}
