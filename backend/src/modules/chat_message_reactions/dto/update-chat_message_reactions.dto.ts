import { PartialType } from '@nestjs/mapped-types';
import { CreateChatMessageReactionsDto } from './create-chat_message_reactions.dto';

export class UpdateChatMessageReactionsDto extends PartialType(CreateChatMessageReactionsDto) {}
