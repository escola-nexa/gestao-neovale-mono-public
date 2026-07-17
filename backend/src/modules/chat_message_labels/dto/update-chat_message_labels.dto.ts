import { PartialType } from '@nestjs/mapped-types';
import { CreateChatMessageLabelsDto } from './create-chat_message_labels.dto';

export class UpdateChatMessageLabelsDto extends PartialType(CreateChatMessageLabelsDto) {}
