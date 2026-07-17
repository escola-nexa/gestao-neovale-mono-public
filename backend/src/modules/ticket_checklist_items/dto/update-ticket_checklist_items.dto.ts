import { PartialType } from '@nestjs/mapped-types';
import { CreateTicketChecklistItemsDto } from './create-ticket_checklist_items.dto';

export class UpdateTicketChecklistItemsDto extends PartialType(CreateTicketChecklistItemsDto) {}
