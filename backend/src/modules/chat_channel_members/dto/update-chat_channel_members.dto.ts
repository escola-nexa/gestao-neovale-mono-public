import { PartialType } from '@nestjs/mapped-types';
import { CreateChatChannelMembersDto } from './create-chat_channel_members.dto';

export class UpdateChatChannelMembersDto extends PartialType(CreateChatChannelMembersDto) {}
