import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPartyBankAccounts } from '../entities/financial_party_bank_accounts.entity';

@Injectable()
export class DeleteFinancialPartyBankAccountsService {
  constructor(
    @InjectRepository(FinancialPartyBankAccounts)
    private readonly repository: Repository<FinancialPartyBankAccounts>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
