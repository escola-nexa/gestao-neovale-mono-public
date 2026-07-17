import { PartialType } from '@nestjs/mapped-types';
import { CreateTicketLabelsDto } from './create-ticket_labels.dto';

export class UpdateTicketLabelsDto extends PartialType(CreateTicketLabelsDto) {}
