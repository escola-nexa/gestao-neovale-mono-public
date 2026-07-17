import { PartialType } from '@nestjs/mapped-types';
import { CreatePrePlanningsDto } from './create-pre_plannings.dto';

export class UpdatePrePlanningsDto extends PartialType(CreatePrePlanningsDto) {}
