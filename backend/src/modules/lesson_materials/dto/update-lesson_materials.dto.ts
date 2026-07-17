import { PartialType } from '@nestjs/mapped-types';
import { CreateLessonMaterialsDto } from './create-lesson_materials.dto';

export class UpdateLessonMaterialsDto extends PartialType(CreateLessonMaterialsDto) {}
