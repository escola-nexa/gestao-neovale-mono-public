import { PartialType } from '@nestjs/mapped-types';
import { CreateOrganizationsDto } from './create-organizations.dto';

export class UpdateOrganizationsDto extends PartialType(CreateOrganizationsDto) {}
