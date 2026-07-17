import { PartialType } from '@nestjs/mapped-types';
import { CreateProfessorChildrenDto } from './create-professor_children.dto';

export class UpdateProfessorChildrenDto extends PartialType(CreateProfessorChildrenDto) {}
