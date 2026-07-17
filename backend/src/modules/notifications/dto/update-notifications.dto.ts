import { PartialType } from '@nestjs/mapped-types';
import { CreateNotificationsDto } from './create-notifications.dto';

export class UpdateNotificationsDto extends PartialType(CreateNotificationsDto) {}
