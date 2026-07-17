import { PartialType } from '@nestjs/mapped-types';
import { CreateChatMessageMentionsDto } from './create-chat_message_mentions.dto';

export class UpdateChatMessageMentionsDto extends PartialType(CreateChatMessageMentionsDto) {}
