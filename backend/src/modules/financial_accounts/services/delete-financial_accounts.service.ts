import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialAccounts } from '../entities/financial_accounts.entity';

@Injectable()
export class DeleteFinancialAccountsService {
  constructor(
    @InjectRepository(FinancialAccounts)
    private readonly repository: Repository<FinancialAccounts>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
