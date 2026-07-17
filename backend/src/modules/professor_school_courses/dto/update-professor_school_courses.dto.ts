import { PartialType } from '@nestjs/mapped-types';
import { CreateProfessorSchoolCoursesDto } from './create-professor_school_courses.dto';

export class UpdateProfessorSchoolCoursesDto extends PartialType(CreateProfessorSchoolCoursesDto) {}
