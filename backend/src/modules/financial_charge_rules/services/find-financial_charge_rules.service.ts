import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialChargeRules } from '../entities/financial_charge_rules.entity';

@Injectable()
export class FindFinancialChargeRulesService {
  constructor(
    @InjectRepository(FinancialChargeRules)
    private readonly repository: Repository<FinancialChargeRules>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialChargeRules[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialChargeRules | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
