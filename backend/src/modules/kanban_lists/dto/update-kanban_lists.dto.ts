import { PartialType } from '@nestjs/mapped-types';
import { CreateKanbanListsDto } from './create-kanban_lists.dto';

export class UpdateKanbanListsDto extends PartialType(CreateKanbanListsDto) {}
