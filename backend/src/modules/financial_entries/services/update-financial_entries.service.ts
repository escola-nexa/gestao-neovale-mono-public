import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialEntries } from '../entities/financial_entries.entity';
import { UpdateFinancialEntriesDto } from '../dto/update-financial_entries.dto';

@Injectable()
export class UpdateFinancialEntriesService {
  constructor(
    @InjectRepository(FinancialEntries)
    private readonly repository: Repository<FinancialEntries>,
  ) {}

  async execute(id: string, dto: UpdateFinancialEntriesDto, organizationId: string): Promise<FinancialEntries> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
