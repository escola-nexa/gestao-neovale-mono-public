import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPermissionAuditLogs } from '../entities/financial_permission_audit_logs.entity';

@Injectable()
export class DeleteFinancialPermissionAuditLogsService {
  constructor(
    @InjectRepository(FinancialPermissionAuditLogs)
    private readonly repository: Repository<FinancialPermissionAuditLogs>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
