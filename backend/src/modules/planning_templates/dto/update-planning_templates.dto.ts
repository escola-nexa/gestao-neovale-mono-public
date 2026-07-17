import { PartialType } from '@nestjs/mapped-types';
import { CreatePlanningTemplatesDto } from './create-planning_templates.dto';

export class UpdatePlanningTemplatesDto extends PartialType(CreatePlanningTemplatesDto) {}
