import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tickets } from './entities/tickets.entity';
import { TicketsController } from './controllers/tickets.controller';
import { FindTicketsService } from './services/find-tickets.service';
import { CreateTicketsService } from './services/create-tickets.service';
import { UpdateTicketsService } from './services/update-tickets.service';
import { DeleteTicketsService } from './services/delete-tickets.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tickets])],
  controllers: [TicketsController],
  providers: [
    FindTicketsService,
    CreateTicketsService,
    UpdateTicketsService,
    DeleteTicketsService,
  ],
  exports: [FindTicketsService],
})
export class TicketsModule {}
