import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialChargeRules } from '../entities/financial_charge_rules.entity';
import { CreateFinancialChargeRulesDto } from '../dto/create-financial_charge_rules.dto';

@Injectable()
export class CreateFinancialChargeRulesService {
  constructor(
    @InjectRepository(FinancialChargeRules)
    private readonly repository: Repository<FinancialChargeRules>,
  ) {}

  async execute(dto: CreateFinancialChargeRulesDto, organizationId: string): Promise<FinancialChargeRules> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
