import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessageReads } from './entities/chat_message_reads.entity';
import { ChatMessageReadsController } from './controllers/chat_message_reads.controller';
import { FindChatMessageReadsService } from './services/find-chat_message_reads.service';
import { CreateChatMessageReadsService } from './services/create-chat_message_reads.service';
import { UpdateChatMessageReadsService } from './services/update-chat_message_reads.service';
import { DeleteChatMessageReadsService } from './services/delete-chat_message_reads.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChatMessageReads])],
  controllers: [ChatMessageReadsController],
  providers: [
    FindChatMessageReadsService,
    CreateChatMessageReadsService,
    UpdateChatMessageReadsService,
    DeleteChatMessageReadsService,
  ],
  exports: [FindChatMessageReadsService],
})
export class ChatMessageReadsModule {}
