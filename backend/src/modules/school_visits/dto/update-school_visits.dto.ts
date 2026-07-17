import { PartialType } from '@nestjs/mapped-types';
import { CreateSchoolVisitsDto } from './create-school_visits.dto';

export class UpdateSchoolVisitsDto extends PartialType(CreateSchoolVisitsDto) {}
