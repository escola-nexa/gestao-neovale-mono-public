import { PartialType } from '@nestjs/mapped-types';
import { CreateBookletDeliveryUsersDto } from './create-booklet_delivery_users.dto';

export class UpdateBookletDeliveryUsersDto extends PartialType(CreateBookletDeliveryUsersDto) {}
