import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanningAuditLog } from '../entities/planning_audit_log.entity';
import { UpdatePlanningAuditLogDto } from '../dto/update-planning_audit_log.dto';

@Injectable()
export class UpdatePlanningAuditLogService {
  constructor(
    @InjectRepository(PlanningAuditLog)
    private readonly repository: Repository<PlanningAuditLog>,
  ) {}

  async execute(id: string, dto: UpdatePlanningAuditLogDto, organizationId: string): Promise<PlanningAuditLog> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
