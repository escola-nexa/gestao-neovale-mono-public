import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialBankTransactions } from '../entities/financial_bank_transactions.entity';

@Injectable()
export class DeleteFinancialBankTransactionsService {
  constructor(
    @InjectRepository(FinancialBankTransactions)
    private readonly repository: Repository<FinancialBankTransactions>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
