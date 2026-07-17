import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessageTickets } from './entities/chat_message_tickets.entity';
import { ChatMessageTicketsController } from './controllers/chat_message_tickets.controller';
import { FindChatMessageTicketsService } from './services/find-chat_message_tickets.service';
import { CreateChatMessageTicketsService } from './services/create-chat_message_tickets.service';
import { UpdateChatMessageTicketsService } from './services/update-chat_message_tickets.service';
import { DeleteChatMessageTicketsService } from './services/delete-chat_message_tickets.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChatMessageTickets])],
  controllers: [ChatMessageTicketsController],
  providers: [
    FindChatMessageTicketsService,
    CreateChatMessageTicketsService,
    UpdateChatMessageTicketsService,
    DeleteChatMessageTicketsService,
  ],
  exports: [FindChatMessageTicketsService],
})
export class ChatMessageTicketsModule {}
