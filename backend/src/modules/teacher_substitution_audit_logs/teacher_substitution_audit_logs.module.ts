import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherSubstitutionAuditLogs } from './entities/teacher_substitution_audit_logs.entity';
import { TeacherSubstitutionAuditLogsController } from './controllers/teacher_substitution_audit_logs.controller';
import { FindTeacherSubstitutionAuditLogsService } from './services/find-teacher_substitution_audit_logs.service';
import { CreateTeacherSubstitutionAuditLogsService } from './services/create-teacher_substitution_audit_logs.service';
import { UpdateTeacherSubstitutionAuditLogsService } from './services/update-teacher_substitution_audit_logs.service';
import { DeleteTeacherSubstitutionAuditLogsService } from './services/delete-teacher_substitution_audit_logs.service';

@Module({
  imports: [TypeOrmModule.forFeature([TeacherSubstitutionAuditLogs])],
  controllers: [TeacherSubstitutionAuditLogsController],
  providers: [
    FindTeacherSubstitutionAuditLogsService,
    CreateTeacherSubstitutionAuditLogsService,
    UpdateTeacherSubstitutionAuditLogsService,
    DeleteTeacherSubstitutionAuditLogsService,
  ],
  exports: [FindTeacherSubstitutionAuditLogsService],
})
export class TeacherSubstitutionAuditLogsModule {}
