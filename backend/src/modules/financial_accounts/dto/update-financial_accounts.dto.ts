import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialAccountsDto } from './create-financial_accounts.dto';

export class UpdateFinancialAccountsDto extends PartialType(CreateFinancialAccountsDto) {}
