import { PartialType } from '@nestjs/mapped-types';
import { CreateTicketChecklistsDto } from './create-ticket_checklists.dto';

export class UpdateTicketChecklistsDto extends PartialType(CreateTicketChecklistsDto) {}
