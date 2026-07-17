import { PartialType } from '@nestjs/mapped-types';
import { CreateTeacherSubstitutionStatusHistoryDto } from './create-teacher_substitution_status_history.dto';

export class UpdateTeacherSubstitutionStatusHistoryDto extends PartialType(CreateTeacherSubstitutionStatusHistoryDto) {}
