import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherAttendanceAuditLogs } from '../entities/teacher_attendance_audit_logs.entity';

@Injectable()
export class FindTeacherAttendanceAuditLogsService {
  constructor(
    @InjectRepository(TeacherAttendanceAuditLogs)
    private readonly repository: Repository<TeacherAttendanceAuditLogs>,
  ) {}

  async findAll(organizationId: string): Promise<TeacherAttendanceAuditLogs[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<TeacherAttendanceAuditLogs | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
