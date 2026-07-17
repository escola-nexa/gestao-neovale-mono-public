import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialApprovalPolicies } from '../entities/financial_approval_policies.entity';
import { UpdateFinancialApprovalPoliciesDto } from '../dto/update-financial_approval_policies.dto';

@Injectable()
export class UpdateFinancialApprovalPoliciesService {
  constructor(
    @InjectRepository(FinancialApprovalPolicies)
    private readonly repository: Repository<FinancialApprovalPolicies>,
  ) {}

  async execute(id: string, dto: UpdateFinancialApprovalPoliciesDto, organizationId: string): Promise<FinancialApprovalPolicies> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
