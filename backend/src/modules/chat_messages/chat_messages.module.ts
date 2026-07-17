import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessages } from './entities/chat_messages.entity';
import { ChatMessagesController } from './controllers/chat_messages.controller';
import { FindChatMessagesService } from './services/find-chat_messages.service';
import { CreateChatMessagesService } from './services/create-chat_messages.service';
import { UpdateChatMessagesService } from './services/update-chat_messages.service';
import { DeleteChatMessagesService } from './services/delete-chat_messages.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChatMessages])],
  controllers: [ChatMessagesController],
  providers: [
    FindChatMessagesService,
    CreateChatMessagesService,
    UpdateChatMessagesService,
    DeleteChatMessagesService,
  ],
  exports: [FindChatMessagesService],
})
export class ChatMessagesModule {}
