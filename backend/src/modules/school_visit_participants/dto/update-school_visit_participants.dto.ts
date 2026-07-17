import { PartialType } from '@nestjs/mapped-types';
import { CreateSchoolVisitParticipantsDto } from './create-school_visit_participants.dto';

export class UpdateSchoolVisitParticipantsDto extends PartialType(CreateSchoolVisitParticipantsDto) {}
