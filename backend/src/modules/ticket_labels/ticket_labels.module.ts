import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketLabels } from './entities/ticket_labels.entity';
import { TicketLabelsController } from './controllers/ticket_labels.controller';
import { FindTicketLabelsService } from './services/find-ticket_labels.service';
import { CreateTicketLabelsService } from './services/create-ticket_labels.service';
import { UpdateTicketLabelsService } from './services/update-ticket_labels.service';
import { DeleteTicketLabelsService } from './services/delete-ticket_labels.service';

@Module({
  imports: [TypeOrmModule.forFeature([TicketLabels])],
  controllers: [TicketLabelsController],
  providers: [
    FindTicketLabelsService,
    CreateTicketLabelsService,
    UpdateTicketLabelsService,
    DeleteTicketLabelsService,
  ],
  exports: [FindTicketLabelsService],
})
export class TicketLabelsModule {}
