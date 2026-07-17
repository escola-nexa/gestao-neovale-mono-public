import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialBudgetLines } from '../entities/financial_budget_lines.entity';
import { CreateFinancialBudgetLinesDto } from '../dto/create-financial_budget_lines.dto';

@Injectable()
export class CreateFinancialBudgetLinesService {
  constructor(
    @InjectRepository(FinancialBudgetLines)
    private readonly repository: Repository<FinancialBudgetLines>,
  ) {}

  async execute(dto: CreateFinancialBudgetLinesDto, organizationId: string): Promise<FinancialBudgetLines> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
