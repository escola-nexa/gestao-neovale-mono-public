import { PartialType } from '@nestjs/mapped-types';
import { CreateAuditEventsDto } from './create-audit_events.dto';

export class UpdateAuditEventsDto extends PartialType(CreateAuditEventsDto) {}
