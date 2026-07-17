import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanningTemplates } from '../entities/planning_templates.entity';
import { CreatePlanningTemplatesDto } from '../dto/create-planning_templates.dto';

@Injectable()
export class CreatePlanningTemplatesService {
  constructor(
    @InjectRepository(PlanningTemplates)
    private readonly repository: Repository<PlanningTemplates>,
  ) {}

  async execute(dto: CreatePlanningTemplatesDto, organizationId: string): Promise<PlanningTemplates> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
