import { PartialType } from '@nestjs/mapped-types';
import { CreateBookletDeliveryItemsDto } from './create-booklet_delivery_items.dto';

export class UpdateBookletDeliveryItemsDto extends PartialType(CreateBookletDeliveryItemsDto) {}
