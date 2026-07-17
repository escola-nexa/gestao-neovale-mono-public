import { PartialType } from '@nestjs/mapped-types';
import { CreateHrHiringAuditLogsDto } from './create-hr_hiring_audit_logs.dto';

export class UpdateHrHiringAuditLogsDto extends PartialType(CreateHrHiringAuditLogsDto) {}
