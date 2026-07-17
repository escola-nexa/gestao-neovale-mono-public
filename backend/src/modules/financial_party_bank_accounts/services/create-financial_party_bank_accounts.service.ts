import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPartyBankAccounts } from '../entities/financial_party_bank_accounts.entity';
import { CreateFinancialPartyBankAccountsDto } from '../dto/create-financial_party_bank_accounts.dto';

@Injectable()
export class CreateFinancialPartyBankAccountsService {
  constructor(
    @InjectRepository(FinancialPartyBankAccounts)
    private readonly repository: Repository<FinancialPartyBankAccounts>,
  ) {}

  async execute(dto: CreateFinancialPartyBankAccountsDto, organizationId: string): Promise<FinancialPartyBankAccounts> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
