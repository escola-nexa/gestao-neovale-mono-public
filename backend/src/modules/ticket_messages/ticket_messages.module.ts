import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketMessages } from './entities/ticket_messages.entity';
import { TicketMessagesController } from './controllers/ticket_messages.controller';
import { FindTicketMessagesService } from './services/find-ticket_messages.service';
import { CreateTicketMessagesService } from './services/create-ticket_messages.service';
import { UpdateTicketMessagesService } from './services/update-ticket_messages.service';
import { DeleteTicketMessagesService } from './services/delete-ticket_messages.service';

@Module({
  imports: [TypeOrmModule.forFeature([TicketMessages])],
  controllers: [TicketMessagesController],
  providers: [
    FindTicketMessagesService,
    CreateTicketMessagesService,
    UpdateTicketMessagesService,
    DeleteTicketMessagesService,
  ],
  exports: [FindTicketMessagesService],
})
export class TicketMessagesModule {}
