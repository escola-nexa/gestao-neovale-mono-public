import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialApprovals } from '../entities/financial_approvals.entity';

@Injectable()
export class FindFinancialApprovalsService {
  constructor(
    @InjectRepository(FinancialApprovals)
    private readonly repository: Repository<FinancialApprovals>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialApprovals[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialApprovals | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
