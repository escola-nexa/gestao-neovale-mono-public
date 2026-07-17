import { PartialType } from '@nestjs/mapped-types';
import { CreateCourseSchoolsDto } from './create-course_schools.dto';

export class UpdateCourseSchoolsDto extends PartialType(CreateCourseSchoolsDto) {}
