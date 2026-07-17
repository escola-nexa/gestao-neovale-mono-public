import { PartialType } from '@nestjs/mapped-types';
import { CreateTicketMessagesDto } from './create-ticket_messages.dto';

export class UpdateTicketMessagesDto extends PartialType(CreateTicketMessagesDto) {}
