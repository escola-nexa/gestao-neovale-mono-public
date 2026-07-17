import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialReconciliations } from '../entities/financial_reconciliations.entity';

@Injectable()
export class FindFinancialReconciliationsService {
  constructor(
    @InjectRepository(FinancialReconciliations)
    private readonly repository: Repository<FinancialReconciliations>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialReconciliations[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialReconciliations | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
