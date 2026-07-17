import { PartialType } from '@nestjs/mapped-types';
import { CreateTicketWatchersDto } from './create-ticket_watchers.dto';

export class UpdateTicketWatchersDto extends PartialType(CreateTicketWatchersDto) {}
