import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitRouteAiRecommendations } from './entities/visit_route_ai_recommendations.entity';
import { VisitRouteAiRecommendationsController } from './controllers/visit_route_ai_recommendations.controller';
import { FindVisitRouteAiRecommendationsService } from './services/find-visit_route_ai_recommendations.service';
import { CreateVisitRouteAiRecommendationsService } from './services/create-visit_route_ai_recommendations.service';
import { UpdateVisitRouteAiRecommendationsService } from './services/update-visit_route_ai_recommendations.service';
import { DeleteVisitRouteAiRecommendationsService } from './services/delete-visit_route_ai_recommendations.service';

@Module({
  imports: [TypeOrmModule.forFeature([VisitRouteAiRecommendations])],
  controllers: [VisitRouteAiRecommendationsController],
  providers: [
    FindVisitRouteAiRecommendationsService,
    CreateVisitRouteAiRecommendationsService,
    UpdateVisitRouteAiRecommendationsService,
    DeleteVisitRouteAiRecommendationsService,
  ],
  exports: [FindVisitRouteAiRecommendationsService],
})
export class VisitRouteAiRecommendationsModule {}
