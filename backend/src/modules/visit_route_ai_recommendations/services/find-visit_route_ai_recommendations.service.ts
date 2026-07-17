import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisitRouteAiRecommendations } from '../entities/visit_route_ai_recommendations.entity';

@Injectable()
export class FindVisitRouteAiRecommendationsService {
  constructor(
    @InjectRepository(VisitRouteAiRecommendations)
    private readonly repository: Repository<VisitRouteAiRecommendations>,
  ) {}

  async findAll(organizationId: string): Promise<VisitRouteAiRecommendations[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<VisitRouteAiRecommendations | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
