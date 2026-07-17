import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatChannelLabels } from './entities/chat_channel_labels.entity';
import { ChatChannelLabelsController } from './controllers/chat_channel_labels.controller';
import { FindChatChannelLabelsService } from './services/find-chat_channel_labels.service';
import { CreateChatChannelLabelsService } from './services/create-chat_channel_labels.service';
import { UpdateChatChannelLabelsService } from './services/update-chat_channel_labels.service';
import { DeleteChatChannelLabelsService } from './services/delete-chat_channel_labels.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChatChannelLabels])],
  controllers: [ChatChannelLabelsController],
  providers: [
    FindChatChannelLabelsService,
    CreateChatChannelLabelsService,
    UpdateChatChannelLabelsService,
    DeleteChatChannelLabelsService,
  ],
  exports: [FindChatChannelLabelsService],
})
export class ChatChannelLabelsModule {}
