import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrAllocationPlans } from '../entities/hr_allocation_plans.entity';

@Injectable()
export class FindHrAllocationPlansService {
  constructor(
    @InjectRepository(HrAllocationPlans)
    private readonly repository: Repository<HrAllocationPlans>,
  ) {}

  async findAll(organizationId: string): Promise<HrAllocationPlans[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<HrAllocationPlans | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
