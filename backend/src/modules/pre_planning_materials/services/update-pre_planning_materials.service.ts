import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrePlanningMaterials } from '../entities/pre_planning_materials.entity';
import { UpdatePrePlanningMaterialsDto } from '../dto/update-pre_planning_materials.dto';

@Injectable()
export class UpdatePrePlanningMaterialsService {
  constructor(
    @InjectRepository(PrePlanningMaterials)
    private readonly repository: Repository<PrePlanningMaterials>,
  ) {}

  async execute(id: string, dto: UpdatePrePlanningMaterialsDto, organizationId: string): Promise<PrePlanningMaterials> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
