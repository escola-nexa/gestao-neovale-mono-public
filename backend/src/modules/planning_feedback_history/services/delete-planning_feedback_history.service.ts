import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanningFeedbackHistory } from '../entities/planning_feedback_history.entity';

@Injectable()
export class DeletePlanningFeedbackHistoryService {
  constructor(
    @InjectRepository(PlanningFeedbackHistory)
    private readonly repository: Repository<PlanningFeedbackHistory>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
