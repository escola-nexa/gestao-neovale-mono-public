import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessageLabels } from './entities/chat_message_labels.entity';
import { ChatMessageLabelsController } from './controllers/chat_message_labels.controller';
import { FindChatMessageLabelsService } from './services/find-chat_message_labels.service';
import { CreateChatMessageLabelsService } from './services/create-chat_message_labels.service';
import { UpdateChatMessageLabelsService } from './services/update-chat_message_labels.service';
import { DeleteChatMessageLabelsService } from './services/delete-chat_message_labels.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChatMessageLabels])],
  controllers: [ChatMessageLabelsController],
  providers: [
    FindChatMessageLabelsService,
    CreateChatMessageLabelsService,
    UpdateChatMessageLabelsService,
    DeleteChatMessageLabelsService,
  ],
  exports: [FindChatMessageLabelsService],
})
export class ChatMessageLabelsModule {}
