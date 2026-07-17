import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanningTemplates } from '../entities/planning_templates.entity';
import { UpdatePlanningTemplatesDto } from '../dto/update-planning_templates.dto';

@Injectable()
export class UpdatePlanningTemplatesService {
  constructor(
    @InjectRepository(PlanningTemplates)
    private readonly repository: Repository<PlanningTemplates>,
  ) {}

  async execute(id: string, dto: UpdatePlanningTemplatesDto, organizationId: string): Promise<PlanningTemplates> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
