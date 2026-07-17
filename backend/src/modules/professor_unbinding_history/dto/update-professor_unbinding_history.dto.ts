import { PartialType } from '@nestjs/mapped-types';
import { CreateProfessorUnbindingHistoryDto } from './create-professor_unbinding_history.dto';

export class UpdateProfessorUnbindingHistoryDto extends PartialType(CreateProfessorUnbindingHistoryDto) {}
