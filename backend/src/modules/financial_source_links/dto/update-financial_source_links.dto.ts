import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialSourceLinksDto } from './create-financial_source_links.dto';

export class UpdateFinancialSourceLinksDto extends PartialType(CreateFinancialSourceLinksDto) {}
