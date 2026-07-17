import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialEntries } from '../entities/financial_entries.entity';

@Injectable()
export class DeleteFinancialEntriesService {
  constructor(
    @InjectRepository(FinancialEntries)
    private readonly repository: Repository<FinancialEntries>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
