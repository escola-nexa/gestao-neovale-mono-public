import { PartialType } from '@nestjs/mapped-types';
import { CreateVisitRoutesDto } from './create-visit_routes.dto';

export class UpdateVisitRoutesDto extends PartialType(CreateVisitRoutesDto) {}
