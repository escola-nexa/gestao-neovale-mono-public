import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPartyBankHistory } from '../entities/financial_party_bank_history.entity';
import { UpdateFinancialPartyBankHistoryDto } from '../dto/update-financial_party_bank_history.dto';

@Injectable()
export class UpdateFinancialPartyBankHistoryService {
  constructor(
    @InjectRepository(FinancialPartyBankHistory)
    private readonly repository: Repository<FinancialPartyBankHistory>,
  ) {}

  async execute(id: string, dto: UpdateFinancialPartyBankHistoryDto, organizationId: string): Promise<FinancialPartyBankHistory> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
