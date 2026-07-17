import { PartialType } from '@nestjs/mapped-types';
import { CreateTeacherSubstitutionAuditLogsDto } from './create-teacher_substitution_audit_logs.dto';

export class UpdateTeacherSubstitutionAuditLogsDto extends PartialType(CreateTeacherSubstitutionAuditLogsDto) {}
