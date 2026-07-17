import { PartialType } from '@nestjs/mapped-types';
import { CreateVisitRouteLogsDto } from './create-visit_route_logs.dto';

export class UpdateVisitRouteLogsDto extends PartialType(CreateVisitRouteLogsDto) {}
