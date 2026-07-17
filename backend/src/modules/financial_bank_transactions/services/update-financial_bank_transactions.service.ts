import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialBankTransactions } from '../entities/financial_bank_transactions.entity';
import { UpdateFinancialBankTransactionsDto } from '../dto/update-financial_bank_transactions.dto';

@Injectable()
export class UpdateFinancialBankTransactionsService {
  constructor(
    @InjectRepository(FinancialBankTransactions)
    private readonly repository: Repository<FinancialBankTransactions>,
  ) {}

  async execute(id: string, dto: UpdateFinancialBankTransactionsDto, organizationId: string): Promise<FinancialBankTransactions> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
