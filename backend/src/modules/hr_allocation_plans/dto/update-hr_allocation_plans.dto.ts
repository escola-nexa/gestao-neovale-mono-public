import { PartialType } from '@nestjs/mapped-types';
import { CreateHrAllocationPlansDto } from './create-hr_allocation_plans.dto';

export class UpdateHrAllocationPlansDto extends PartialType(CreateHrAllocationPlansDto) {}
