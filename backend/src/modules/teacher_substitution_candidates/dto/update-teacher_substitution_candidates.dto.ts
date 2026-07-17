import { PartialType } from '@nestjs/mapped-types';
import { CreateTeacherSubstitutionCandidatesDto } from './create-teacher_substitution_candidates.dto';

export class UpdateTeacherSubstitutionCandidatesDto extends PartialType(CreateTeacherSubstitutionCandidatesDto) {}
