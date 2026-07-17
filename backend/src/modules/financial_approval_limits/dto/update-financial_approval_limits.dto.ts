import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialApprovalLimitsDto } from './create-financial_approval_limits.dto';

export class UpdateFinancialApprovalLimitsDto extends PartialType(CreateFinancialApprovalLimitsDto) {}
