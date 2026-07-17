import { PartialType } from '@nestjs/mapped-types';
import { CreateBookletDeliverySchoolsDto } from './create-booklet_delivery_schools.dto';

export class UpdateBookletDeliverySchoolsDto extends PartialType(CreateBookletDeliverySchoolsDto) {}
