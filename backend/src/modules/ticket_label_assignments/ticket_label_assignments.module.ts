import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketLabelAssignments } from './entities/ticket_label_assignments.entity';
import { TicketLabelAssignmentsController } from './controllers/ticket_label_assignments.controller';
import { FindTicketLabelAssignmentsService } from './services/find-ticket_label_assignments.service';
import { CreateTicketLabelAssignmentsService } from './services/create-ticket_label_assignments.service';
import { UpdateTicketLabelAssignmentsService } from './services/update-ticket_label_assignments.service';
import { DeleteTicketLabelAssignmentsService } from './services/delete-ticket_label_assignments.service';

@Module({
  imports: [TypeOrmModule.forFeature([TicketLabelAssignments])],
  controllers: [TicketLabelAssignmentsController],
  providers: [
    FindTicketLabelAssignmentsService,
    CreateTicketLabelAssignmentsService,
    UpdateTicketLabelAssignmentsService,
    DeleteTicketLabelAssignmentsService,
  ],
  exports: [FindTicketLabelAssignmentsService],
})
export class TicketLabelAssignmentsModule {}
