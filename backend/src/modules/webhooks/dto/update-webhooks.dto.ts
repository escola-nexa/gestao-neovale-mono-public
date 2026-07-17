import { PartialType } from '@nestjs/mapped-types';
import { CreateWebhooksDto } from './create-webhooks.dto';

export class UpdateWebhooksDto extends PartialType(CreateWebhooksDto) {}
