import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialBudgets } from '../entities/financial_budgets.entity';
import { UpdateFinancialBudgetsDto } from '../dto/update-financial_budgets.dto';

@Injectable()
export class UpdateFinancialBudgetsService {
  constructor(
    @InjectRepository(FinancialBudgets)
    private readonly repository: Repository<FinancialBudgets>,
  ) {}

  async execute(id: string, dto: UpdateFinancialBudgetsDto, organizationId: string): Promise<FinancialBudgets> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
