import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialEntryAllocations } from '../entities/financial_entry_allocations.entity';
import { CreateFinancialEntryAllocationsDto } from '../dto/create-financial_entry_allocations.dto';

@Injectable()
export class CreateFinancialEntryAllocationsService {
  constructor(
    @InjectRepository(FinancialEntryAllocations)
    private readonly repository: Repository<FinancialEntryAllocations>,
  ) {}

  async execute(dto: CreateFinancialEntryAllocationsDto, organizationId: string): Promise<FinancialEntryAllocations> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
