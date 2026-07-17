import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrHiringAuditLogs } from '../entities/hr_hiring_audit_logs.entity';

@Injectable()
export class DeleteHrHiringAuditLogsService {
  constructor(
    @InjectRepository(HrHiringAuditLogs)
    private readonly repository: Repository<HrHiringAuditLogs>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
