import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialAttachmentsDto } from './create-financial_attachments.dto';

export class UpdateFinancialAttachmentsDto extends PartialType(CreateFinancialAttachmentsDto) {}
