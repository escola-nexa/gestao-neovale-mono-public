import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialSettingsDto } from './create-financial_settings.dto';

export class UpdateFinancialSettingsDto extends PartialType(CreateFinancialSettingsDto) {}
