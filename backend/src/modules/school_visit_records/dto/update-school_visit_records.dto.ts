import { PartialType } from '@nestjs/mapped-types';
import { CreateSchoolVisitRecordsDto } from './create-school_visit_records.dto';

export class UpdateSchoolVisitRecordsDto extends PartialType(CreateSchoolVisitRecordsDto) {}
