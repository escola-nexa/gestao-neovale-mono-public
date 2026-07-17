import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatChannels } from './entities/chat_channels.entity';
import { ChatChannelsController } from './controllers/chat_channels.controller';
import { ChatUnreadController } from './controllers/chat-unread.controller';
import { FindChatChannelsService } from './services/find-chat_channels.service';
import { CreateChatChannelsService } from './services/create-chat_channels.service';
import { UpdateChatChannelsService } from './services/update-chat_channels.service';
import { DeleteChatChannelsService } from './services/delete-chat_channels.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChatChannels])],
  controllers: [ChatChannelsController, ChatUnreadController],
  providers: [
    FindChatChannelsService,
    CreateChatChannelsService,
    UpdateChatChannelsService,
    DeleteChatChannelsService,
  ],
  exports: [FindChatChannelsService],
})
export class ChatChannelsModule {}
