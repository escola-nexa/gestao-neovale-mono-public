import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialBudgetLines } from '../entities/financial_budget_lines.entity';

@Injectable()
export class FindFinancialBudgetLinesService {
  constructor(
    @InjectRepository(FinancialBudgetLines)
    private readonly repository: Repository<FinancialBudgetLines>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialBudgetLines[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialBudgetLines | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
