import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialDocumentTypesDto } from './create-financial_document_types.dto';

export class UpdateFinancialDocumentTypesDto extends PartialType(CreateFinancialDocumentTypesDto) {}
