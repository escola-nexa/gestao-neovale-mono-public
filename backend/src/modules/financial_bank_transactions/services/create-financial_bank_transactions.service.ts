import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialBankTransactions } from '../entities/financial_bank_transactions.entity';
import { CreateFinancialBankTransactionsDto } from '../dto/create-financial_bank_transactions.dto';

@Injectable()
export class CreateFinancialBankTransactionsService {
  constructor(
    @InjectRepository(FinancialBankTransactions)
    private readonly repository: Repository<FinancialBankTransactions>,
  ) {}

  async execute(dto: CreateFinancialBankTransactionsDto, organizationId: string): Promise<FinancialBankTransactions> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
