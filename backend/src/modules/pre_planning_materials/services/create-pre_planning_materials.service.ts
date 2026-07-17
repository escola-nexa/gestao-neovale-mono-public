import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrePlanningMaterials } from '../entities/pre_planning_materials.entity';
import { CreatePrePlanningMaterialsDto } from '../dto/create-pre_planning_materials.dto';

@Injectable()
export class CreatePrePlanningMaterialsService {
  constructor(
    @InjectRepository(PrePlanningMaterials)
    private readonly repository: Repository<PrePlanningMaterials>,
  ) {}

  async execute(dto: CreatePrePlanningMaterialsDto, organizationId: string): Promise<PrePlanningMaterials> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
