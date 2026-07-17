import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPartyBankAccounts } from '../entities/financial_party_bank_accounts.entity';

@Injectable()
export class FindFinancialPartyBankAccountsService {
  constructor(
    @InjectRepository(FinancialPartyBankAccounts)
    private readonly repository: Repository<FinancialPartyBankAccounts>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialPartyBankAccounts[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialPartyBankAccounts | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
