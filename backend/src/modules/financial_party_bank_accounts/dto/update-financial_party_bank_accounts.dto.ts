import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialPartyBankAccountsDto } from './create-financial_party_bank_accounts.dto';

export class UpdateFinancialPartyBankAccountsDto extends PartialType(CreateFinancialPartyBankAccountsDto) {}
