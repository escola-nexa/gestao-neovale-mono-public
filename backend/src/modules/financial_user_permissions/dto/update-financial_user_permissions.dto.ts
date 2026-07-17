import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialUserPermissionsDto } from './create-financial_user_permissions.dto';

export class UpdateFinancialUserPermissionsDto extends PartialType(CreateFinancialUserPermissionsDto) {}
