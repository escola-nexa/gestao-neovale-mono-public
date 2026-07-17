import { PartialType } from '@nestjs/mapped-types';
import { CreatePwaPushedNotificationsDto } from './create-pwa_pushed_notifications.dto';

export class UpdatePwaPushedNotificationsDto extends PartialType(CreatePwaPushedNotificationsDto) {}
