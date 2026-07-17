import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrAllocationPlans } from '../entities/hr_allocation_plans.entity';

@Injectable()
export class DeleteHrAllocationPlansService {
  constructor(
    @InjectRepository(HrAllocationPlans)
    private readonly repository: Repository<HrAllocationPlans>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
