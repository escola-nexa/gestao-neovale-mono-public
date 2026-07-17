import { PartialType } from '@nestjs/mapped-types';
import { CreateChatChannelLabelsDto } from './create-chat_channel_labels.dto';

export class UpdateChatChannelLabelsDto extends PartialType(CreateChatChannelLabelsDto) {}
