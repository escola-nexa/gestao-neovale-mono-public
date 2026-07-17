import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrAllocationItems } from '../entities/hr_allocation_items.entity';

@Injectable()
export class DeleteHrAllocationItemsService {
  constructor(
    @InjectRepository(HrAllocationItems)
    private readonly repository: Repository<HrAllocationItems>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
