import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialBudgetLines } from '../entities/financial_budget_lines.entity';

@Injectable()
export class DeleteFinancialBudgetLinesService {
  constructor(
    @InjectRepository(FinancialBudgetLines)
    private readonly repository: Repository<FinancialBudgetLines>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
