import { PartialType } from '@nestjs/mapped-types';
import { CreatePrePlanningMaterialsDto } from './create-pre_planning_materials.dto';

export class UpdatePrePlanningMaterialsDto extends PartialType(CreatePrePlanningMaterialsDto) {}
