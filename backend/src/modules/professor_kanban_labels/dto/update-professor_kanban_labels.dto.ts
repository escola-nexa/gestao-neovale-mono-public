import { PartialType } from '@nestjs/mapped-types';
import { CreateProfessorKanbanLabelsDto } from './create-professor_kanban_labels.dto';

export class UpdateProfessorKanbanLabelsDto extends PartialType(CreateProfessorKanbanLabelsDto) {}
