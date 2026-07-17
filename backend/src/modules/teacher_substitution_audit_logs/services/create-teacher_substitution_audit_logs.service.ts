import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionAuditLogs } from '../entities/teacher_substitution_audit_logs.entity';
import { CreateTeacherSubstitutionAuditLogsDto } from '../dto/create-teacher_substitution_audit_logs.dto';

@Injectable()
export class CreateTeacherSubstitutionAuditLogsService {
  constructor(
    @InjectRepository(TeacherSubstitutionAuditLogs)
    private readonly repository: Repository<TeacherSubstitutionAuditLogs>,
  ) {}

  async execute(dto: CreateTeacherSubstitutionAuditLogsDto, organizationId: string): Promise<TeacherSubstitutionAuditLogs> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
