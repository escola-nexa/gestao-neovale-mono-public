import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionAuditLogs } from '../entities/teacher_substitution_audit_logs.entity';

@Injectable()
export class DeleteTeacherSubstitutionAuditLogsService {
  constructor(
    @InjectRepository(TeacherSubstitutionAuditLogs)
    private readonly repository: Repository<TeacherSubstitutionAuditLogs>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
