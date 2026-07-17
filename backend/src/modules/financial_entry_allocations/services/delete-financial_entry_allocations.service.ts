import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialEntryAllocations } from '../entities/financial_entry_allocations.entity';

@Injectable()
export class DeleteFinancialEntryAllocationsService {
  constructor(
    @InjectRepository(FinancialEntryAllocations)
    private readonly repository: Repository<FinancialEntryAllocations>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
