import { PartialType } from '@nestjs/mapped-types';
import { CreatePwaSettingsDto } from './create-pwa_settings.dto';

export class UpdatePwaSettingsDto extends PartialType(CreatePwaSettingsDto) {}
