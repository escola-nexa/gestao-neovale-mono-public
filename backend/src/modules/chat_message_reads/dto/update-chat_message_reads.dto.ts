import { PartialType } from '@nestjs/mapped-types';
import { CreateChatMessageReadsDto } from './create-chat_message_reads.dto';

export class UpdateChatMessageReadsDto extends PartialType(CreateChatMessageReadsDto) {}
