import { PartialType } from '@nestjs/mapped-types';
import { CreateTalentPoolCandidatesDto } from './create-talent_pool_candidates.dto';

export class UpdateTalentPoolCandidatesDto extends PartialType(CreateTalentPoolCandidatesDto) {}
