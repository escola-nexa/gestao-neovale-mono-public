import { PartialType } from '@nestjs/mapped-types';
import { CreateProfessorStatusHistoryDto } from './create-professor_status_history.dto';

export class UpdateProfessorStatusHistoryDto extends PartialType(CreateProfessorStatusHistoryDto) {}
