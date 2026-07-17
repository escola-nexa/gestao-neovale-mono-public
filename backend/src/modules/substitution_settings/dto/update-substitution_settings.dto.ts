import { PartialType } from '@nestjs/mapped-types';
import { CreateSubstitutionSettingsDto } from './create-substitution_settings.dto';

export class UpdateSubstitutionSettingsDto extends PartialType(CreateSubstitutionSettingsDto) {}
