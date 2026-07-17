import { PartialType } from '@nestjs/mapped-types';
import { CreateBookletDeliveryAttachmentsDto } from './create-booklet_delivery_attachments.dto';

export class UpdateBookletDeliveryAttachmentsDto extends PartialType(CreateBookletDeliveryAttachmentsDto) {}
