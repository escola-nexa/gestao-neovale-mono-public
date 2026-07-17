import { PartialType } from '@nestjs/mapped-types';
import { CreateOnesignalSettingsDto } from './create-onesignal_settings.dto';

export class UpdateOnesignalSettingsDto extends PartialType(CreateOnesignalSettingsDto) {}
