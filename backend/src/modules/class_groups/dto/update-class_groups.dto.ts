import { PartialType } from '@nestjs/mapped-types';
import { CreateClassGroupsDto } from './create-class_groups.dto';

export class UpdateClassGroupsDto extends PartialType(CreateClassGroupsDto) {}
