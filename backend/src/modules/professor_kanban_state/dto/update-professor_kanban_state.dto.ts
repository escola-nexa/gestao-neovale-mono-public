import { PartialType } from '@nestjs/mapped-types';
import { CreateProfessorKanbanStateDto } from './create-professor_kanban_state.dto';

export class UpdateProfessorKanbanStateDto extends PartialType(CreateProfessorKanbanStateDto) {}
