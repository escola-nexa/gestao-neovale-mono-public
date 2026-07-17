import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialPartiesDto } from './create-financial_parties.dto';

export class UpdateFinancialPartiesDto extends PartialType(CreateFinancialPartiesDto) {}
