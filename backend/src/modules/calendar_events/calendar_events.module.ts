import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarEvents } from './entities/calendar_events.entity';
import { CalendarEventsController } from './controllers/calendar_events.controller';
import { FindCalendarEventsService } from './services/find-calendar_events.service';
import { CreateCalendarEventsService } from './services/create-calendar_events.service';
import { UpdateCalendarEventsService } from './services/update-calendar_events.service';
import { DeleteCalendarEventsService } from './services/delete-calendar_events.service';

@Module({
  imports: [TypeOrmModule.forFeature([CalendarEvents])],
  controllers: [CalendarEventsController],
  providers: [
    FindCalendarEventsService,
    CreateCalendarEventsService,
    UpdateCalendarEventsService,
    DeleteCalendarEventsService,
  ],
  exports: [FindCalendarEventsService],
})
export class CalendarEventsModule {}
