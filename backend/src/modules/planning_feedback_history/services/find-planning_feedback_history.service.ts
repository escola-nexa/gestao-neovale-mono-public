import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanningFeedbackHistory } from '../entities/planning_feedback_history.entity';

@Injectable()
export class FindPlanningFeedbackHistoryService {
  constructor(
    @InjectRepository(PlanningFeedbackHistory)
    private readonly repository: Repository<PlanningFeedbackHistory>,
  ) {}

  async findAll(organizationId: string): Promise<PlanningFeedbackHistory[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<PlanningFeedbackHistory | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
