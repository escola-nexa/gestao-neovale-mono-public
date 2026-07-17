import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialEntryAllocations } from '../entities/financial_entry_allocations.entity';

@Injectable()
export class FindFinancialEntryAllocationsService {
  constructor(
    @InjectRepository(FinancialEntryAllocations)
    private readonly repository: Repository<FinancialEntryAllocations>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialEntryAllocations[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialEntryAllocations | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
