import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherAttendanceAuditLogs } from '../entities/teacher_attendance_audit_logs.entity';
import { UpdateTeacherAttendanceAuditLogsDto } from '../dto/update-teacher_attendance_audit_logs.dto';

@Injectable()
export class UpdateTeacherAttendanceAuditLogsService {
  constructor(
    @InjectRepository(TeacherAttendanceAuditLogs)
    private readonly repository: Repository<TeacherAttendanceAuditLogs>,
  ) {}

  async execute(id: string, dto: UpdateTeacherAttendanceAuditLogsDto, organizationId: string): Promise<TeacherAttendanceAuditLogs> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
