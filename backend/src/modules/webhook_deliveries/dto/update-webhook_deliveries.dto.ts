import { PartialType } from '@nestjs/mapped-types';
import { CreateWebhookDeliveriesDto } from './create-webhook_deliveries.dto';

export class UpdateWebhookDeliveriesDto extends PartialType(CreateWebhookDeliveriesDto) {}
