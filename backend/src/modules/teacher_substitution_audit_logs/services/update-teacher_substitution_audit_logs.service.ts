import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionAuditLogs } from '../entities/teacher_substitution_audit_logs.entity';
import { UpdateTeacherSubstitutionAuditLogsDto } from '../dto/update-teacher_substitution_audit_logs.dto';

@Injectable()
export class UpdateTeacherSubstitutionAuditLogsService {
  constructor(
    @InjectRepository(TeacherSubstitutionAuditLogs)
    private readonly repository: Repository<TeacherSubstitutionAuditLogs>,
  ) {}

  async execute(id: string, dto: UpdateTeacherSubstitutionAuditLogsDto, organizationId: string): Promise<TeacherSubstitutionAuditLogs> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
