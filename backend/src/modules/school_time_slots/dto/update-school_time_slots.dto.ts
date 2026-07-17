import { PartialType } from '@nestjs/mapped-types';
import { CreateSchoolTimeSlotsDto } from './create-school_time_slots.dto';

export class UpdateSchoolTimeSlotsDto extends PartialType(CreateSchoolTimeSlotsDto) {}
