import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPermissionAuditLogs } from '../entities/financial_permission_audit_logs.entity';
import { UpdateFinancialPermissionAuditLogsDto } from '../dto/update-financial_permission_audit_logs.dto';

@Injectable()
export class UpdateFinancialPermissionAuditLogsService {
  constructor(
    @InjectRepository(FinancialPermissionAuditLogs)
    private readonly repository: Repository<FinancialPermissionAuditLogs>,
  ) {}

  async execute(id: string, dto: UpdateFinancialPermissionAuditLogsDto, organizationId: string): Promise<FinancialPermissionAuditLogs> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
