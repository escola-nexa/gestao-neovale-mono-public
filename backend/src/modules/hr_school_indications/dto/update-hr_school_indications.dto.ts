import { PartialType } from '@nestjs/mapped-types';
import { CreateHrSchoolIndicationsDto } from './create-hr_school_indications.dto';

export class UpdateHrSchoolIndicationsDto extends PartialType(CreateHrSchoolIndicationsDto) {}
