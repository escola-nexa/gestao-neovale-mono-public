import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisitRouteAiRecommendations } from '../entities/visit_route_ai_recommendations.entity';
import { CreateVisitRouteAiRecommendationsDto } from '../dto/create-visit_route_ai_recommendations.dto';

@Injectable()
export class CreateVisitRouteAiRecommendationsService {
  constructor(
    @InjectRepository(VisitRouteAiRecommendations)
    private readonly repository: Repository<VisitRouteAiRecommendations>,
  ) {}

  async execute(dto: CreateVisitRouteAiRecommendationsDto, organizationId: string): Promise<VisitRouteAiRecommendations> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
