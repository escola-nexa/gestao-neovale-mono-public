import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialApprovalPolicies } from '../entities/financial_approval_policies.entity';

@Injectable()
export class DeleteFinancialApprovalPoliciesService {
  constructor(
    @InjectRepository(FinancialApprovalPolicies)
    private readonly repository: Repository<FinancialApprovalPolicies>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
