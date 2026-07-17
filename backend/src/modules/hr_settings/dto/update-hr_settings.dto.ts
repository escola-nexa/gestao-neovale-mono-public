import { PartialType } from '@nestjs/mapped-types';
import { CreateHrSettingsDto } from './create-hr_settings.dto';

export class UpdateHrSettingsDto extends PartialType(CreateHrSettingsDto) {}
