import { PartialType } from '@nestjs/mapped-types';
import { CreateVisitRouteCitiesDto } from './create-visit_route_cities.dto';

export class UpdateVisitRouteCitiesDto extends PartialType(CreateVisitRouteCitiesDto) {}
