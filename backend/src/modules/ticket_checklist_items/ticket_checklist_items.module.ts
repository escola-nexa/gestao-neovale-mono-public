import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketChecklistItems } from './entities/ticket_checklist_items.entity';
import { TicketChecklistItemsController } from './controllers/ticket_checklist_items.controller';
import { FindTicketChecklistItemsService } from './services/find-ticket_checklist_items.service';
import { CreateTicketChecklistItemsService } from './services/create-ticket_checklist_items.service';
import { UpdateTicketChecklistItemsService } from './services/update-ticket_checklist_items.service';
import { DeleteTicketChecklistItemsService } from './services/delete-ticket_checklist_items.service';

@Module({
  imports: [TypeOrmModule.forFeature([TicketChecklistItems])],
  controllers: [TicketChecklistItemsController],
  providers: [
    FindTicketChecklistItemsService,
    CreateTicketChecklistItemsService,
    UpdateTicketChecklistItemsService,
    DeleteTicketChecklistItemsService,
  ],
  exports: [FindTicketChecklistItemsService],
})
export class TicketChecklistItemsModule {}
