import { PartialType } from '@nestjs/mapped-types';
import { CreateProfessorContactLogsDto } from './create-professor_contact_logs.dto';

export class UpdateProfessorContactLogsDto extends PartialType(CreateProfessorContactLogsDto) {}
