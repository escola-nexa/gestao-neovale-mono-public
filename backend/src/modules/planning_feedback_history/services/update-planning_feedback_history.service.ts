import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanningFeedbackHistory } from '../entities/planning_feedback_history.entity';
import { UpdatePlanningFeedbackHistoryDto } from '../dto/update-planning_feedback_history.dto';

@Injectable()
export class UpdatePlanningFeedbackHistoryService {
  constructor(
    @InjectRepository(PlanningFeedbackHistory)
    private readonly repository: Repository<PlanningFeedbackHistory>,
  ) {}

  async execute(id: string, dto: UpdatePlanningFeedbackHistoryDto, organizationId: string): Promise<PlanningFeedbackHistory> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
