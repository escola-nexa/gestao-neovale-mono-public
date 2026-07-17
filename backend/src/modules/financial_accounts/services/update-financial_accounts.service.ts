import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialAccounts } from '../entities/financial_accounts.entity';
import { UpdateFinancialAccountsDto } from '../dto/update-financial_accounts.dto';

@Injectable()
export class UpdateFinancialAccountsService {
  constructor(
    @InjectRepository(FinancialAccounts)
    private readonly repository: Repository<FinancialAccounts>,
  ) {}

  async execute(id: string, dto: UpdateFinancialAccountsDto, organizationId: string): Promise<FinancialAccounts> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
