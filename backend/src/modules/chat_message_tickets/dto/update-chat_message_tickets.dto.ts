import { PartialType } from '@nestjs/mapped-types';
import { CreateChatMessageTicketsDto } from './create-chat_message_tickets.dto';

export class UpdateChatMessageTicketsDto extends PartialType(CreateChatMessageTicketsDto) {}
