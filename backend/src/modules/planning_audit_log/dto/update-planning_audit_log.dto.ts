import { PartialType } from '@nestjs/mapped-types';
import { CreatePlanningAuditLogDto } from './create-planning_audit_log.dto';

export class UpdatePlanningAuditLogDto extends PartialType(CreatePlanningAuditLogDto) {}
