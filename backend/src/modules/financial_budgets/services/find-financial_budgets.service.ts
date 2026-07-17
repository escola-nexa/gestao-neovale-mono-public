import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialBudgets } from '../entities/financial_budgets.entity';

@Injectable()
export class FindFinancialBudgetsService {
  constructor(
    @InjectRepository(FinancialBudgets)
    private readonly repository: Repository<FinancialBudgets>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialBudgets[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialBudgets | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
