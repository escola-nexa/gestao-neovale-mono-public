import { PartialType } from '@nestjs/mapped-types';
import { CreateTeacherSubstitutionOccurrencesDto } from './create-teacher_substitution_occurrences.dto';

export class UpdateTeacherSubstitutionOccurrencesDto extends PartialType(CreateTeacherSubstitutionOccurrencesDto) {}
