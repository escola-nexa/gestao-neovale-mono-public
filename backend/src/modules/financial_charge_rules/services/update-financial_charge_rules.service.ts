import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialChargeRules } from '../entities/financial_charge_rules.entity';
import { UpdateFinancialChargeRulesDto } from '../dto/update-financial_charge_rules.dto';

@Injectable()
export class UpdateFinancialChargeRulesService {
  constructor(
    @InjectRepository(FinancialChargeRules)
    private readonly repository: Repository<FinancialChargeRules>,
  ) {}

  async execute(id: string, dto: UpdateFinancialChargeRulesDto, organizationId: string): Promise<FinancialChargeRules> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
