import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialBudgets } from '../entities/financial_budgets.entity';
import { CreateFinancialBudgetsDto } from '../dto/create-financial_budgets.dto';

@Injectable()
export class CreateFinancialBudgetsService {
  constructor(
    @InjectRepository(FinancialBudgets)
    private readonly repository: Repository<FinancialBudgets>,
  ) {}

  async execute(dto: CreateFinancialBudgetsDto, organizationId: string): Promise<FinancialBudgets> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
