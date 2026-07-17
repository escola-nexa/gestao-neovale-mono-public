import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPermissionAuditLogs } from '../entities/financial_permission_audit_logs.entity';
import { CreateFinancialPermissionAuditLogsDto } from '../dto/create-financial_permission_audit_logs.dto';

@Injectable()
export class CreateFinancialPermissionAuditLogsService {
  constructor(
    @InjectRepository(FinancialPermissionAuditLogs)
    private readonly repository: Repository<FinancialPermissionAuditLogs>,
  ) {}

  async execute(dto: CreateFinancialPermissionAuditLogsDto, organizationId: string): Promise<FinancialPermissionAuditLogs> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
