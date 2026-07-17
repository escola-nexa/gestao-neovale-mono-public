import { PartialType } from '@nestjs/mapped-types';
import { CreateBookletDeliveriesDto } from './create-booklet_deliveries.dto';

export class UpdateBookletDeliveriesDto extends PartialType(CreateBookletDeliveriesDto) {}
