import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialBankTransactions } from '../entities/financial_bank_transactions.entity';

@Injectable()
export class FindFinancialBankTransactionsService {
  constructor(
    @InjectRepository(FinancialBankTransactions)
    private readonly repository: Repository<FinancialBankTransactions>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialBankTransactions[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialBankTransactions | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
