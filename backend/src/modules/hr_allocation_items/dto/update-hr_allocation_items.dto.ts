import { PartialType } from '@nestjs/mapped-types';
import { CreateHrAllocationItemsDto } from './create-hr_allocation_items.dto';

export class UpdateHrAllocationItemsDto extends PartialType(CreateHrAllocationItemsDto) {}
