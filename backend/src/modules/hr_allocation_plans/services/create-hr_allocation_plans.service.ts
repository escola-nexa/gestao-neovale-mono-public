import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrAllocationPlans } from '../entities/hr_allocation_plans.entity';
import { CreateHrAllocationPlansDto } from '../dto/create-hr_allocation_plans.dto';

@Injectable()
export class CreateHrAllocationPlansService {
  constructor(
    @InjectRepository(HrAllocationPlans)
    private readonly repository: Repository<HrAllocationPlans>,
  ) {}

  async execute(dto: CreateHrAllocationPlansDto, organizationId: string): Promise<HrAllocationPlans> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
