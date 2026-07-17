import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialRoleTemplatePermissionsDto } from './create-financial_role_template_permissions.dto';

export class UpdateFinancialRoleTemplatePermissionsDto extends PartialType(CreateFinancialRoleTemplatePermissionsDto) {}
