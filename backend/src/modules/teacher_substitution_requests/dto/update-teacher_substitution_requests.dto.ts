import { PartialType } from '@nestjs/mapped-types';
import { CreateTeacherSubstitutionRequestsDto } from './create-teacher_substitution_requests.dto';

export class UpdateTeacherSubstitutionRequestsDto extends PartialType(CreateTeacherSubstitutionRequestsDto) {}
