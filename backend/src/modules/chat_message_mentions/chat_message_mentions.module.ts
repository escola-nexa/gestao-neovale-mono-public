import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessageMentions } from './entities/chat_message_mentions.entity';
import { ChatMessageMentionsController } from './controllers/chat_message_mentions.controller';
import { FindChatMessageMentionsService } from './services/find-chat_message_mentions.service';
import { CreateChatMessageMentionsService } from './services/create-chat_message_mentions.service';
import { UpdateChatMessageMentionsService } from './services/update-chat_message_mentions.service';
import { DeleteChatMessageMentionsService } from './services/delete-chat_message_mentions.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChatMessageMentions])],
  controllers: [ChatMessageMentionsController],
  providers: [
    FindChatMessageMentionsService,
    CreateChatMessageMentionsService,
    UpdateChatMessageMentionsService,
    DeleteChatMessageMentionsService,
  ],
  exports: [FindChatMessageMentionsService],
})
export class ChatMessageMentionsModule {}
