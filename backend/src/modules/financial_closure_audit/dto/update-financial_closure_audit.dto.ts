import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialClosureAuditDto } from './create-financial_closure_audit.dto';

export class UpdateFinancialClosureAuditDto extends PartialType(CreateFinancialClosureAuditDto) {}
