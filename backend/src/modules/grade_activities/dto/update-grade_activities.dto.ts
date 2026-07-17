import { PartialType } from '@nestjs/mapped-types';
import { CreateGradeActivitiesDto } from './create-grade_activities.dto';

export class UpdateGradeActivitiesDto extends PartialType(CreateGradeActivitiesDto) {}
