import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessageReactions } from './entities/chat_message_reactions.entity';
import { ChatMessageReactionsController } from './controllers/chat_message_reactions.controller';
import { FindChatMessageReactionsService } from './services/find-chat_message_reactions.service';
import { CreateChatMessageReactionsService } from './services/create-chat_message_reactions.service';
import { UpdateChatMessageReactionsService } from './services/update-chat_message_reactions.service';
import { DeleteChatMessageReactionsService } from './services/delete-chat_message_reactions.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChatMessageReactions])],
  controllers: [ChatMessageReactionsController],
  providers: [
    FindChatMessageReactionsService,
    CreateChatMessageReactionsService,
    UpdateChatMessageReactionsService,
    DeleteChatMessageReactionsService,
  ],
  exports: [FindChatMessageReactionsService],
})
export class ChatMessageReactionsModule {}
