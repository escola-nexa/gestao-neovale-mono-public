import { PartialType } from '@nestjs/mapped-types';
import { CreateVisitRouteSchoolsDto } from './create-visit_route_schools.dto';

export class UpdateVisitRouteSchoolsDto extends PartialType(CreateVisitRouteSchoolsDto) {}
