import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialPermissionAuditLogsDto } from './create-financial_permission_audit_logs.dto';

export class UpdateFinancialPermissionAuditLogsDto extends PartialType(CreateFinancialPermissionAuditLogsDto) {}
