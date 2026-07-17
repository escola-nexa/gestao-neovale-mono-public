import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPermissionAuditLogs } from '../entities/financial_permission_audit_logs.entity';

@Injectable()
export class FindFinancialPermissionAuditLogsService {
  constructor(
    @InjectRepository(FinancialPermissionAuditLogs)
    private readonly repository: Repository<FinancialPermissionAuditLogs>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialPermissionAuditLogs[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialPermissionAuditLogs | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
