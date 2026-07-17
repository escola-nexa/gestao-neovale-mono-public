import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPartyBankHistory } from '../entities/financial_party_bank_history.entity';

@Injectable()
export class DeleteFinancialPartyBankHistoryService {
  constructor(
    @InjectRepository(FinancialPartyBankHistory)
    private readonly repository: Repository<FinancialPartyBankHistory>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
