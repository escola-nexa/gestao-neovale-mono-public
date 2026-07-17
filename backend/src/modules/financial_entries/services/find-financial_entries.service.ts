import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialEntries } from '../entities/financial_entries.entity';

@Injectable()
export class FindFinancialEntriesService {
  constructor(
    @InjectRepository(FinancialEntries)
    private readonly repository: Repository<FinancialEntries>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialEntries[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialEntries | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
