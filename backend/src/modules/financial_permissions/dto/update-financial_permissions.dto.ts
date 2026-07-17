import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialPermissionsDto } from './create-financial_permissions.dto';

export class UpdateFinancialPermissionsDto extends PartialType(CreateFinancialPermissionsDto) {}
