import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialClosureAudit } from '../entities/financial_closure_audit.entity';

@Injectable()
export class FindFinancialClosureAuditService {
  constructor(
    @InjectRepository(FinancialClosureAudit)
    private readonly repository: Repository<FinancialClosureAudit>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialClosureAudit[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialClosureAudit | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
