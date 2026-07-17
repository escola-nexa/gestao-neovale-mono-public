import { PartialType } from '@nestjs/mapped-types';
import { CreateOnesignalSendLogDto } from './create-onesignal_send_log.dto';

export class UpdateOnesignalSendLogDto extends PartialType(CreateOnesignalSendLogDto) {}
