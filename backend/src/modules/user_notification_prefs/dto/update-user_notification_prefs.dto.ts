import { PartialType } from '@nestjs/mapped-types';
import { CreateUserNotificationPrefsDto } from './create-user_notification_prefs.dto';

export class UpdateUserNotificationPrefsDto extends PartialType(CreateUserNotificationPrefsDto) {}
