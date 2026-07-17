import { PartialType } from '@nestjs/mapped-types';
import { CreateVisitRouteAiRecommendationsDto } from './create-visit_route_ai_recommendations.dto';

export class UpdateVisitRouteAiRecommendationsDto extends PartialType(CreateVisitRouteAiRecommendationsDto) {}
