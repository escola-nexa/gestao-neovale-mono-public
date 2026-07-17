import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionAuditLogs } from '../entities/teacher_substitution_audit_logs.entity';

@Injectable()
export class FindTeacherSubstitutionAuditLogsService {
  constructor(
    @InjectRepository(TeacherSubstitutionAuditLogs)
    private readonly repository: Repository<TeacherSubstitutionAuditLogs>,
  ) {}

  async findAll(organizationId: string): Promise<TeacherSubstitutionAuditLogs[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<TeacherSubstitutionAuditLogs | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
