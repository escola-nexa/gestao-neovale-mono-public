import { PartialType } from '@nestjs/mapped-types';
import { CreateBrandingSettingsDto } from './create-branding_settings.dto';

export class UpdateBrandingSettingsDto extends PartialType(CreateBrandingSettingsDto) {}
