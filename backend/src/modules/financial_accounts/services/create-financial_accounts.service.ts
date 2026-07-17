import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialAccounts } from '../entities/financial_accounts.entity';
import { CreateFinancialAccountsDto } from '../dto/create-financial_accounts.dto';

@Injectable()
export class CreateFinancialAccountsService {
  constructor(
    @InjectRepository(FinancialAccounts)
    private readonly repository: Repository<FinancialAccounts>,
  ) {}

  async execute(dto: CreateFinancialAccountsDto, organizationId: string): Promise<FinancialAccounts> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
