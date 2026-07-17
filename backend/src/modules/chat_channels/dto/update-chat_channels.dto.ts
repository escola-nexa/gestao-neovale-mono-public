import { PartialType } from '@nestjs/mapped-types';
import { CreateChatChannelsDto } from './create-chat_channels.dto';

export class UpdateChatChannelsDto extends PartialType(CreateChatChannelsDto) {}
