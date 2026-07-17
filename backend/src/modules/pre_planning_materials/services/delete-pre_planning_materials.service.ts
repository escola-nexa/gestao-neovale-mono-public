import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrePlanningMaterials } from '../entities/pre_planning_materials.entity';

@Injectable()
export class DeletePrePlanningMaterialsService {
  constructor(
    @InjectRepository(PrePlanningMaterials)
    private readonly repository: Repository<PrePlanningMaterials>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
