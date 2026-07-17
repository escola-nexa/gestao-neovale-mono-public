import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatUserInboxState } from './entities/chat_user_inbox_state.entity';
import { ChatUserInboxStateController } from './controllers/chat_user_inbox_state.controller';
import { FindChatUserInboxStateService } from './services/find-chat_user_inbox_state.service';
import { CreateChatUserInboxStateService } from './services/create-chat_user_inbox_state.service';
import { UpdateChatUserInboxStateService } from './services/update-chat_user_inbox_state.service';
import { DeleteChatUserInboxStateService } from './services/delete-chat_user_inbox_state.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChatUserInboxState])],
  controllers: [ChatUserInboxStateController],
  providers: [
    FindChatUserInboxStateService,
    CreateChatUserInboxStateService,
    UpdateChatUserInboxStateService,
    DeleteChatUserInboxStateService,
  ],
  exports: [FindChatUserInboxStateService],
})
export class ChatUserInboxStateModule {}
