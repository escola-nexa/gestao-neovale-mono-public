import { PartialType } from '@nestjs/mapped-types';
import { CreateSchoolVisitUsersDto } from './create-school_visit_users.dto';

export class UpdateSchoolVisitUsersDto extends PartialType(CreateSchoolVisitUsersDto) {}
