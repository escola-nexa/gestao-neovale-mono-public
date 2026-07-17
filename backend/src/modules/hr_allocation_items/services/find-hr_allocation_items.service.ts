import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrAllocationItems } from '../entities/hr_allocation_items.entity';

@Injectable()
export class FindHrAllocationItemsService {
  constructor(
    @InjectRepository(HrAllocationItems)
    private readonly repository: Repository<HrAllocationItems>,
  ) {}

  async findAll(organizationId: string): Promise<HrAllocationItems[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<HrAllocationItems | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
