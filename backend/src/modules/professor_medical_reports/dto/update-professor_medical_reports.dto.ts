import { PartialType } from '@nestjs/mapped-types';
import { CreateProfessorMedicalReportsDto } from './create-professor_medical_reports.dto';

export class UpdateProfessorMedicalReportsDto extends PartialType(CreateProfessorMedicalReportsDto) {}
