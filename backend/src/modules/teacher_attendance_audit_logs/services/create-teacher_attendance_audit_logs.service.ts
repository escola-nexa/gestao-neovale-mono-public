import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherAttendanceAuditLogs } from '../entities/teacher_attendance_audit_logs.entity';
import { CreateTeacherAttendanceAuditLogsDto } from '../dto/create-teacher_attendance_audit_logs.dto';

@Injectable()
export class CreateTeacherAttendanceAuditLogsService {
  constructor(
    @InjectRepository(TeacherAttendanceAuditLogs)
    private readonly repository: Repository<TeacherAttendanceAuditLogs>,
  ) {}

  async execute(dto: CreateTeacherAttendanceAuditLogsDto, organizationId: string): Promise<TeacherAttendanceAuditLogs> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
