import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrHiringAuditLogs } from '../entities/hr_hiring_audit_logs.entity';
import { CreateHrHiringAuditLogsDto } from '../dto/create-hr_hiring_audit_logs.dto';

@Injectable()
export class CreateHrHiringAuditLogsService {
  constructor(
    @InjectRepository(HrHiringAuditLogs)
    private readonly repository: Repository<HrHiringAuditLogs>,
  ) {}

  async execute(dto: CreateHrHiringAuditLogsDto, organizationId: string): Promise<HrHiringAuditLogs> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
