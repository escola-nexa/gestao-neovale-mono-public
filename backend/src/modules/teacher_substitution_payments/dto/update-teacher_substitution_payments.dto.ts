import { PartialType } from '@nestjs/mapped-types';
import { CreateTeacherSubstitutionPaymentsDto } from './create-teacher_substitution_payments.dto';

export class UpdateTeacherSubstitutionPaymentsDto extends PartialType(CreateTeacherSubstitutionPaymentsDto) {}
