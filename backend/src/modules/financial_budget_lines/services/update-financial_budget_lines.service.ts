import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialBudgetLines } from '../entities/financial_budget_lines.entity';
import { UpdateFinancialBudgetLinesDto } from '../dto/update-financial_budget_lines.dto';

@Injectable()
export class UpdateFinancialBudgetLinesService {
  constructor(
    @InjectRepository(FinancialBudgetLines)
    private readonly repository: Repository<FinancialBudgetLines>,
  ) {}

  async execute(id: string, dto: UpdateFinancialBudgetLinesDto, organizationId: string): Promise<FinancialBudgetLines> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
