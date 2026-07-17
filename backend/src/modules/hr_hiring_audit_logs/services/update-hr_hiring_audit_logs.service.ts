import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrHiringAuditLogs } from '../entities/hr_hiring_audit_logs.entity';
import { UpdateHrHiringAuditLogsDto } from '../dto/update-hr_hiring_audit_logs.dto';

@Injectable()
export class UpdateHrHiringAuditLogsService {
  constructor(
    @InjectRepository(HrHiringAuditLogs)
    private readonly repository: Repository<HrHiringAuditLogs>,
  ) {}

  async execute(id: string, dto: UpdateHrHiringAuditLogsDto, organizationId: string): Promise<HrHiringAuditLogs> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
