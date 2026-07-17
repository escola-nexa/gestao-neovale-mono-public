import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketAssignees } from './entities/ticket_assignees.entity';
import { TicketAssigneesController } from './controllers/ticket_assignees.controller';
import { FindTicketAssigneesService } from './services/find-ticket_assignees.service';
import { CreateTicketAssigneesService } from './services/create-ticket_assignees.service';
import { UpdateTicketAssigneesService } from './services/update-ticket_assignees.service';
import { DeleteTicketAssigneesService } from './services/delete-ticket_assignees.service';

@Module({
  imports: [TypeOrmModule.forFeature([TicketAssignees])],
  controllers: [TicketAssigneesController],
  providers: [
    FindTicketAssigneesService,
    CreateTicketAssigneesService,
    UpdateTicketAssigneesService,
    DeleteTicketAssigneesService,
  ],
  exports: [FindTicketAssigneesService],
})
export class TicketAssigneesModule {}
