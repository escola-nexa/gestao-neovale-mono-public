import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPartyBankAccounts } from '../entities/financial_party_bank_accounts.entity';
import { UpdateFinancialPartyBankAccountsDto } from '../dto/update-financial_party_bank_accounts.dto';

@Injectable()
export class UpdateFinancialPartyBankAccountsService {
  constructor(
    @InjectRepository(FinancialPartyBankAccounts)
    private readonly repository: Repository<FinancialPartyBankAccounts>,
  ) {}

  async execute(id: string, dto: UpdateFinancialPartyBankAccountsDto, organizationId: string): Promise<FinancialPartyBankAccounts> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
