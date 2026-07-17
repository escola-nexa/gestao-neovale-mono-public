import { PartialType } from '@nestjs/mapped-types';
import { CreateGradeConfigurationsDto } from './create-grade_configurations.dto';

export class UpdateGradeConfigurationsDto extends PartialType(CreateGradeConfigurationsDto) {}
