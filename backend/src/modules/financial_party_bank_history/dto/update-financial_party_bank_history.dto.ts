import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialPartyBankHistoryDto } from './create-financial_party_bank_history.dto';

export class UpdateFinancialPartyBankHistoryDto extends PartialType(CreateFinancialPartyBankHistoryDto) {}
