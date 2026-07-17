import { PartialType } from '@nestjs/mapped-types';
import { CreateHrSubjectUcpOverridesDto } from './create-hr_subject_ucp_overrides.dto';

export class UpdateHrSubjectUcpOverridesDto extends PartialType(CreateHrSubjectUcpOverridesDto) {}
