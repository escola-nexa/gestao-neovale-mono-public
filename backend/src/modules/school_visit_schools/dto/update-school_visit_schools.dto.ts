import { PartialType } from '@nestjs/mapped-types';
import { CreateSchoolVisitSchoolsDto } from './create-school_visit_schools.dto';

export class UpdateSchoolVisitSchoolsDto extends PartialType(CreateSchoolVisitSchoolsDto) {}
