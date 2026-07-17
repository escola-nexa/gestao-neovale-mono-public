import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrePlannings } from '../entities/pre_plannings.entity';

@Injectable()
export class FindPrePlanningsService {
  constructor(
    @InjectRepository(PrePlannings)
    private readonly repository: Repository<PrePlannings>,
  ) {}

  async findAll(organizationId: string): Promise<PrePlannings[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<PrePlannings | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
