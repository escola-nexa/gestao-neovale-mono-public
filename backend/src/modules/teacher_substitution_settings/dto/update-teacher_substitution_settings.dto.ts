import { PartialType } from '@nestjs/mapped-types';
import { CreateTeacherSubstitutionSettingsDto } from './create-teacher_substitution_settings.dto';

export class UpdateTeacherSubstitutionSettingsDto extends PartialType(CreateTeacherSubstitutionSettingsDto) {}
