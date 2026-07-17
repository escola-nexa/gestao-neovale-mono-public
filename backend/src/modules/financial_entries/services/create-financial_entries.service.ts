import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialEntries } from '../entities/financial_entries.entity';
import { CreateFinancialEntriesDto } from '../dto/create-financial_entries.dto';

@Injectable()
export class CreateFinancialEntriesService {
  constructor(
    @InjectRepository(FinancialEntries)
    private readonly repository: Repository<FinancialEntries>,
  ) {}

  async execute(dto: CreateFinancialEntriesDto, organizationId: string): Promise<FinancialEntries> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
