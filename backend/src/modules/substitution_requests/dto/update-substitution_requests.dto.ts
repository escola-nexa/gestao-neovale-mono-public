import { PartialType } from '@nestjs/mapped-types';
import { CreateSubstitutionRequestsDto } from './create-substitution_requests.dto';

export class UpdateSubstitutionRequestsDto extends PartialType(CreateSubstitutionRequestsDto) {}
