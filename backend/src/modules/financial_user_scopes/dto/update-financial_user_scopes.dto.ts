import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancialUserScopesDto } from './create-financial_user_scopes.dto';

export class UpdateFinancialUserScopesDto extends PartialType(CreateFinancialUserScopesDto) {}
