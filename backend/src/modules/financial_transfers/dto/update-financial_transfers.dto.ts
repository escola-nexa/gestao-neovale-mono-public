import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialTransfersDto } from './create-financial_transfers.dto';

export class UpdateFinancialTransfersDto extends PartialType(CreateFinancialTransfersDto) {}
