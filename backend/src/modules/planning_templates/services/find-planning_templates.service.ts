import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanningTemplates } from '../entities/planning_templates.entity';

@Injectable()
export class FindPlanningTemplatesService {
  constructor(
    @InjectRepository(PlanningTemplates)
    private readonly repository: Repository<PlanningTemplates>,
  ) {}

  async findAll(organizationId: string): Promise<PlanningTemplates[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<PlanningTemplates | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
