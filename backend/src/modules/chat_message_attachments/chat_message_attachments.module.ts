import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessageAttachments } from './entities/chat_message_attachments.entity';
import { ChatMessageAttachmentsController } from './controllers/chat_message_attachments.controller';
import { FindChatMessageAttachmentsService } from './services/find-chat_message_attachments.service';
import { CreateChatMessageAttachmentsService } from './services/create-chat_message_attachments.service';
import { UpdateChatMessageAttachmentsService } from './services/update-chat_message_attachments.service';
import { DeleteChatMessageAttachmentsService } from './services/delete-chat_message_attachments.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChatMessageAttachments])],
  controllers: [ChatMessageAttachmentsController],
  providers: [
    FindChatMessageAttachmentsService,
    CreateChatMessageAttachmentsService,
    UpdateChatMessageAttachmentsService,
    DeleteChatMessageAttachmentsService,
  ],
  exports: [FindChatMessageAttachmentsService],
})
export class ChatMessageAttachmentsModule {}
