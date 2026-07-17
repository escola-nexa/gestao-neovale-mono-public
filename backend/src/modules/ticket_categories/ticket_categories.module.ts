import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketCategories } from './entities/ticket_categories.entity';
import { TicketCategoriesController } from './controllers/ticket_categories.controller';
import { FindTicketCategoriesService } from './services/find-ticket_categories.service';
import { CreateTicketCategoriesService } from './services/create-ticket_categories.service';
import { UpdateTicketCategoriesService } from './services/update-ticket_categories.service';
import { DeleteTicketCategoriesService } from './services/delete-ticket_categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([TicketCategories])],
  controllers: [TicketCategoriesController],
  providers: [
    FindTicketCategoriesService,
    CreateTicketCategoriesService,
    UpdateTicketCategoriesService,
    DeleteTicketCategoriesService,
  ],
  exports: [FindTicketCategoriesService],
})
export class TicketCategoriesModule {}
