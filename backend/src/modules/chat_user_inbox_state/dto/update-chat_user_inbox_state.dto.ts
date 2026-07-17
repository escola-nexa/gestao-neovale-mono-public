import { PartialType } from '@nestjs/mapped-types';
import { CreateChatUserInboxStateDto } from './create-chat_user_inbox_state.dto';

export class UpdateChatUserInboxStateDto extends PartialType(CreateChatUserInboxStateDto) {}
