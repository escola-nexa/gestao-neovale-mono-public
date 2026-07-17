import { PartialType } from '@nestjs/mapped-types';
import { CreateTeacherSubstitutionFinancialAccessDto } from './create-teacher_substitution_financial_access.dto';

export class UpdateTeacherSubstitutionFinancialAccessDto extends PartialType(CreateTeacherSubstitutionFinancialAccessDto) {}
