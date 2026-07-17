import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialEntryAllocations } from '../entities/financial_entry_allocations.entity';
import { UpdateFinancialEntryAllocationsDto } from '../dto/update-financial_entry_allocations.dto';

@Injectable()
export class UpdateFinancialEntryAllocationsService {
  constructor(
    @InjectRepository(FinancialEntryAllocations)
    private readonly repository: Repository<FinancialEntryAllocations>,
  ) {}

  async execute(id: string, dto: UpdateFinancialEntryAllocationsDto, organizationId: string): Promise<FinancialEntryAllocations> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
