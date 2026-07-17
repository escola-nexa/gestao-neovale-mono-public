import { PartialType } from '@nestjs/mapped-types';
import { CreateTicketAssigneesDto } from './create-ticket_assignees.dto';

export class UpdateTicketAssigneesDto extends PartialType(CreateTicketAssigneesDto) {}
