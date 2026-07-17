import { PartialType } from '@nestjs/mapped-types';
import { CreateUserRolesDto } from './create-user_roles.dto';

export class UpdateUserRolesDto extends PartialType(CreateUserRolesDto) {}
