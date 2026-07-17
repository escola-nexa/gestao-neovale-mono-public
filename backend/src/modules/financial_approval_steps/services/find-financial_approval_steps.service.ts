import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialApprovalSteps } from '../entities/financial_approval_steps.entity';

@Injectable()
export class FindFinancialApprovalStepsService {
  constructor(
    @InjectRepository(FinancialApprovalSteps)
    private readonly repository: Repository<FinancialApprovalSteps>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialApprovalSteps[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialApprovalSteps | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
