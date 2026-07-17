import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatSavedMessages } from './entities/chat_saved_messages.entity';
import { ChatSavedMessagesController } from './controllers/chat_saved_messages.controller';
import { FindChatSavedMessagesService } from './services/find-chat_saved_messages.service';
import { CreateChatSavedMessagesService } from './services/create-chat_saved_messages.service';
import { UpdateChatSavedMessagesService } from './services/update-chat_saved_messages.service';
import { DeleteChatSavedMessagesService } from './services/delete-chat_saved_messages.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChatSavedMessages])],
  controllers: [ChatSavedMessagesController],
  providers: [
    FindChatSavedMessagesService,
    CreateChatSavedMessagesService,
    UpdateChatSavedMessagesService,
    DeleteChatSavedMessagesService,
  ],
  exports: [FindChatSavedMessagesService],
})
export class ChatSavedMessagesModule {}
