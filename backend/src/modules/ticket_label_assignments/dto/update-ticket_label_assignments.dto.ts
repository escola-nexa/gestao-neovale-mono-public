import { PartialType } from '@nestjs/mapped-types';
import { CreateTicketLabelAssignmentsDto } from './create-ticket_label_assignments.dto';

export class UpdateTicketLabelAssignmentsDto extends PartialType(CreateTicketLabelAssignmentsDto) {}
