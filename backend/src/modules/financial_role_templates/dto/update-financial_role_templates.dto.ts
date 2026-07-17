import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialRoleTemplatesDto } from './create-financial_role_templates.dto';

export class UpdateFinancialRoleTemplatesDto extends PartialType(CreateFinancialRoleTemplatesDto) {}
