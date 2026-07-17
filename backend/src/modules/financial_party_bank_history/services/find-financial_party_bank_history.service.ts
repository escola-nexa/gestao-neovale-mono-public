import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPartyBankHistory } from '../entities/financial_party_bank_history.entity';

@Injectable()
export class FindFinancialPartyBankHistoryService {
  constructor(
    @InjectRepository(FinancialPartyBankHistory)
    private readonly repository: Repository<FinancialPartyBankHistory>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialPartyBankHistory[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialPartyBankHistory | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
