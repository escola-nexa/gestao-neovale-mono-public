import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialApprovalLimits } from '../entities/financial_approval_limits.entity';

@Injectable()
export class FindFinancialApprovalLimitsService {
  constructor(
    @InjectRepository(FinancialApprovalLimits)
    private readonly repository: Repository<FinancialApprovalLimits>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialApprovalLimits[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialApprovalLimits | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
