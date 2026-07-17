import { PartialType } from '@nestjs/mapped-types';
import { CreateChatMessageAttachmentsDto } from './create-chat_message_attachments.dto';

export class UpdateChatMessageAttachmentsDto extends PartialType(CreateChatMessageAttachmentsDto) {}
