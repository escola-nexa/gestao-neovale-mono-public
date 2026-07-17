import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanningAuditLog } from '../entities/planning_audit_log.entity';

@Injectable()
export class FindPlanningAuditLogService {
  constructor(
    @InjectRepository(PlanningAuditLog)
    private readonly repository: Repository<PlanningAuditLog>,
  ) {}

  async findAll(organizationId: string): Promise<PlanningAuditLog[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<PlanningAuditLog | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
