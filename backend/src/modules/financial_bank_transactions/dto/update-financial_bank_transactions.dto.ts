import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialBankTransactionsDto } from './create-financial_bank_transactions.dto';

export class UpdateFinancialBankTransactionsDto extends PartialType(CreateFinancialBankTransactionsDto) {}
