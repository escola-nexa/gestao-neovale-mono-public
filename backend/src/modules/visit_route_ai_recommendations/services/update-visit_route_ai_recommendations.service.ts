import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisitRouteAiRecommendations } from '../entities/visit_route_ai_recommendations.entity';
import { UpdateVisitRouteAiRecommendationsDto } from '../dto/update-visit_route_ai_recommendations.dto';

@Injectable()
export class UpdateVisitRouteAiRecommendationsService {
  constructor(
    @InjectRepository(VisitRouteAiRecommendations)
    private readonly repository: Repository<VisitRouteAiRecommendations>,
  ) {}

  async execute(id: string, dto: UpdateVisitRouteAiRecommendationsDto, organizationId: string): Promise<VisitRouteAiRecommendations> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
