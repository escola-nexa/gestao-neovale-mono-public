import { PartialType } from '@nestjs/mapped-types';
import { CreateWebhookEventsDto } from './create-webhook_events.dto';

export class UpdateWebhookEventsDto extends PartialType(CreateWebhookEventsDto) {}
