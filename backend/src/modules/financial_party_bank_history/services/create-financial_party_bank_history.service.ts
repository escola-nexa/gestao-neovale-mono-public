import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPartyBankHistory } from '../entities/financial_party_bank_history.entity';
import { CreateFinancialPartyBankHistoryDto } from '../dto/create-financial_party_bank_history.dto';

@Injectable()
export class CreateFinancialPartyBankHistoryService {
  constructor(
    @InjectRepository(FinancialPartyBankHistory)
    private readonly repository: Repository<FinancialPartyBankHistory>,
  ) {}

  async execute(dto: CreateFinancialPartyBankHistoryDto, organizationId: string): Promise<FinancialPartyBankHistory> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
