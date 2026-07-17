import { PartialType } from '@nestjs/mapped-types';
import { CreateTeacherPlanningsDto } from './create-teacher_plannings.dto';

export class UpdateTeacherPlanningsDto extends PartialType(CreateTeacherPlanningsDto) {}
