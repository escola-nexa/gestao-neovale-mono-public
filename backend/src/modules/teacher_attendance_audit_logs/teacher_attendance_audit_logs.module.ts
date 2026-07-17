import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherAttendanceAuditLogs } from './entities/teacher_attendance_audit_logs.entity';
import { TeacherAttendanceAuditLogsController } from './controllers/teacher_attendance_audit_logs.controller';
import { FindTeacherAttendanceAuditLogsService } from './services/find-teacher_attendance_audit_logs.service';
import { CreateTeacherAttendanceAuditLogsService } from './services/create-teacher_attendance_audit_logs.service';
import { UpdateTeacherAttendanceAuditLogsService } from './services/update-teacher_attendance_audit_logs.service';
import { DeleteTeacherAttendanceAuditLogsService } from './services/delete-teacher_attendance_audit_logs.service';

@Module({
  imports: [TypeOrmModule.forFeature([TeacherAttendanceAuditLogs])],
  controllers: [TeacherAttendanceAuditLogsController],
  providers: [
    FindTeacherAttendanceAuditLogsService,
    CreateTeacherAttendanceAuditLogsService,
    UpdateTeacherAttendanceAuditLogsService,
    DeleteTeacherAttendanceAuditLogsService,
  ],
  exports: [FindTeacherAttendanceAuditLogsService],
})
export class TeacherAttendanceAuditLogsModule {}
