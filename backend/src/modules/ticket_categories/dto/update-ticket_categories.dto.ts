import { PartialType } from '@nestjs/mapped-types';
import { CreateTicketCategoriesDto } from './create-ticket_categories.dto';

export class UpdateTicketCategoriesDto extends PartialType(CreateTicketCategoriesDto) {}
