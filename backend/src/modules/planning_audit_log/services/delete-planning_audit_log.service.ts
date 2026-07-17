import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanningAuditLog } from '../entities/planning_audit_log.entity';

@Injectable()
export class DeletePlanningAuditLogService {
  constructor(
    @InjectRepository(PlanningAuditLog)
    private readonly repository: Repository<PlanningAuditLog>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
