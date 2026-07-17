import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketWatchers } from './entities/ticket_watchers.entity';
import { TicketWatchersController } from './controllers/ticket_watchers.controller';
import { FindTicketWatchersService } from './services/find-ticket_watchers.service';
import { CreateTicketWatchersService } from './services/create-ticket_watchers.service';
import { UpdateTicketWatchersService } from './services/update-ticket_watchers.service';
import { DeleteTicketWatchersService } from './services/delete-ticket_watchers.service';

@Module({
  imports: [TypeOrmModule.forFeature([TicketWatchers])],
  controllers: [TicketWatchersController],
  providers: [
    FindTicketWatchersService,
    CreateTicketWatchersService,
    UpdateTicketWatchersService,
    DeleteTicketWatchersService,
  ],
  exports: [FindTicketWatchersService],
})
export class TicketWatchersModule {}
