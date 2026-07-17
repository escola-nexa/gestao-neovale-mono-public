import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialApprovalPolicies } from '../entities/financial_approval_policies.entity';

@Injectable()
export class FindFinancialApprovalPoliciesService {
  constructor(
    @InjectRepository(FinancialApprovalPolicies)
    private readonly repository: Repository<FinancialApprovalPolicies>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialApprovalPolicies[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialApprovalPolicies | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
