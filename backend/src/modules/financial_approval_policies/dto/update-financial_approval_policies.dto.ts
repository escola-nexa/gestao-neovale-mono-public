import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialApprovalPoliciesDto } from './create-financial_approval_policies.dto';

export class UpdateFinancialApprovalPoliciesDto extends PartialType(CreateFinancialApprovalPoliciesDto) {}
