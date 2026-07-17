import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanningAuditLog } from '../entities/planning_audit_log.entity';
import { CreatePlanningAuditLogDto } from '../dto/create-planning_audit_log.dto';

@Injectable()
export class CreatePlanningAuditLogService {
  constructor(
    @InjectRepository(PlanningAuditLog)
    private readonly repository: Repository<PlanningAuditLog>,
  ) {}

  async execute(dto: CreatePlanningAuditLogDto, organizationId: string): Promise<PlanningAuditLog> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
