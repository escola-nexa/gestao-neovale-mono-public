import { PartialType } from '@nestjs/mapped-types';
import { CreateWeeklyTeachingModelsDto } from './create-weekly_teaching_models.dto';

export class UpdateWeeklyTeachingModelsDto extends PartialType(CreateWeeklyTeachingModelsDto) {}
