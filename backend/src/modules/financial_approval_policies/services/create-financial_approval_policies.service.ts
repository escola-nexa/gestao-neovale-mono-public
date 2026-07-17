import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialApprovalPolicies } from '../entities/financial_approval_policies.entity';
import { CreateFinancialApprovalPoliciesDto } from '../dto/create-financial_approval_policies.dto';

@Injectable()
export class CreateFinancialApprovalPoliciesService {
  constructor(
    @InjectRepository(FinancialApprovalPolicies)
    private readonly repository: Repository<FinancialApprovalPolicies>,
  ) {}

  async execute(dto: CreateFinancialApprovalPoliciesDto, organizationId: string): Promise<FinancialApprovalPolicies> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
