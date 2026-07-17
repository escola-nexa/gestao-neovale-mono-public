import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialApprovalStepsDto } from './create-financial_approval_steps.dto';

export class UpdateFinancialApprovalStepsDto extends PartialType(CreateFinancialApprovalStepsDto) {}
