import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanningFeedbackHistory } from '../entities/planning_feedback_history.entity';
import { CreatePlanningFeedbackHistoryDto } from '../dto/create-planning_feedback_history.dto';

@Injectable()
export class CreatePlanningFeedbackHistoryService {
  constructor(
    @InjectRepository(PlanningFeedbackHistory)
    private readonly repository: Repository<PlanningFeedbackHistory>,
  ) {}

  async execute(dto: CreatePlanningFeedbackHistoryDto, organizationId: string): Promise<PlanningFeedbackHistory> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
