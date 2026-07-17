import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialChargeRules } from '../entities/financial_charge_rules.entity';

@Injectable()
export class DeleteFinancialChargeRulesService {
  constructor(
    @InjectRepository(FinancialChargeRules)
    private readonly repository: Repository<FinancialChargeRules>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
