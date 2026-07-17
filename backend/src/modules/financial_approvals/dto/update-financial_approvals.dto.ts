import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialApprovalsDto } from './create-financial_approvals.dto';

export class UpdateFinancialApprovalsDto extends PartialType(CreateFinancialApprovalsDto) {}
