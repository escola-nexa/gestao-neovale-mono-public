import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrePlanningMaterials } from '../entities/pre_planning_materials.entity';

@Injectable()
export class FindPrePlanningMaterialsService {
  constructor(
    @InjectRepository(PrePlanningMaterials)
    private readonly repository: Repository<PrePlanningMaterials>,
  ) {}

  async findAll(organizationId: string): Promise<PrePlanningMaterials[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<PrePlanningMaterials | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
