import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialAccounts } from '../entities/financial_accounts.entity';

@Injectable()
export class FindFinancialAccountsService {
  constructor(
    @InjectRepository(FinancialAccounts)
    private readonly repository: Repository<FinancialAccounts>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialAccounts[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialAccounts | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
