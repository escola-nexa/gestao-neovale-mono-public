import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrHiringAuditLogs } from '../entities/hr_hiring_audit_logs.entity';

@Injectable()
export class FindHrHiringAuditLogsService {
  constructor(
    @InjectRepository(HrHiringAuditLogs)
    private readonly repository: Repository<HrHiringAuditLogs>,
  ) {}

  async findAll(organizationId: string): Promise<HrHiringAuditLogs[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<HrHiringAuditLogs | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
