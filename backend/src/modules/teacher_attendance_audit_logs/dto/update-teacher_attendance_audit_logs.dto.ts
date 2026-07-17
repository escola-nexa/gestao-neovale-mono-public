import { PartialType } from '@nestjs/mapped-types';
import { CreateTeacherAttendanceAuditLogsDto } from './create-teacher_attendance_audit_logs.dto';

export class UpdateTeacherAttendanceAuditLogsDto extends PartialType(CreateTeacherAttendanceAuditLogsDto) {}
