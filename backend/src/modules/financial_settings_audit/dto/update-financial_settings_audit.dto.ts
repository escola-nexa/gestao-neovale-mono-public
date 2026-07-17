import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialSettingsAuditDto } from './create-financial_settings_audit.dto';

export class UpdateFinancialSettingsAuditDto extends PartialType(CreateFinancialSettingsAuditDto) {}
