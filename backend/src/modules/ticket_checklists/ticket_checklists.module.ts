import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketChecklists } from './entities/ticket_checklists.entity';
import { TicketChecklistsController } from './controllers/ticket_checklists.controller';
import { FindTicketChecklistsService } from './services/find-ticket_checklists.service';
import { CreateTicketChecklistsService } from './services/create-ticket_checklists.service';
import { UpdateTicketChecklistsService } from './services/update-ticket_checklists.service';
import { DeleteTicketChecklistsService } from './services/delete-ticket_checklists.service';

@Module({
  imports: [TypeOrmModule.forFeature([TicketChecklists])],
  controllers: [TicketChecklistsController],
  providers: [
    FindTicketChecklistsService,
    CreateTicketChecklistsService,
    UpdateTicketChecklistsService,
    DeleteTicketChecklistsService,
  ],
  exports: [FindTicketChecklistsService],
})
export class TicketChecklistsModule {}
