import { PartialType } from '@nestjs/mapped-types';
import { CreateChatMessagesDto } from './create-chat_messages.dto';

export class UpdateChatMessagesDto extends PartialType(CreateChatMessagesDto) {}
