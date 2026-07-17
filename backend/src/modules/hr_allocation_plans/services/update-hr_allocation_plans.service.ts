import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrAllocationPlans } from '../entities/hr_allocation_plans.entity';
import { UpdateHrAllocationPlansDto } from '../dto/update-hr_allocation_plans.dto';

@Injectable()
export class UpdateHrAllocationPlansService {
  constructor(
    @InjectRepository(HrAllocationPlans)
    private readonly repository: Repository<HrAllocationPlans>,
  ) {}

  async execute(id: string, dto: UpdateHrAllocationPlansDto, organizationId: string): Promise<HrAllocationPlans> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
