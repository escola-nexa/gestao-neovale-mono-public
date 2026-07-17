import { PartialType } from '@nestjs/mapped-types';
import { CreateChatSavedMessagesDto } from './create-chat_saved_messages.dto';

export class UpdateChatSavedMessagesDto extends PartialType(CreateChatSavedMessagesDto) {}
