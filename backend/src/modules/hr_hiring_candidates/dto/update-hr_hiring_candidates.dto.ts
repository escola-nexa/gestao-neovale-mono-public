import { PartialType } from '@nestjs/mapped-types';
import { CreateHrHiringCandidatesDto } from './create-hr_hiring_candidates.dto';

export class UpdateHrHiringCandidatesDto extends PartialType(CreateHrHiringCandidatesDto) {}
