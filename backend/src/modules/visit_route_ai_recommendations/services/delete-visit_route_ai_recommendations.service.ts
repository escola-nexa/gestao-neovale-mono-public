import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisitRouteAiRecommendations } from '../entities/visit_route_ai_recommendations.entity';

@Injectable()
export class DeleteVisitRouteAiRecommendationsService {
  constructor(
    @InjectRepository(VisitRouteAiRecommendations)
    private readonly repository: Repository<VisitRouteAiRecommendations>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
