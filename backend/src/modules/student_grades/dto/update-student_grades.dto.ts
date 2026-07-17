import { PartialType } from '@nestjs/mapped-types';
import { CreateStudentGradesDto } from './create-student_grades.dto';

export class UpdateStudentGradesDto extends PartialType(CreateStudentGradesDto) {}
