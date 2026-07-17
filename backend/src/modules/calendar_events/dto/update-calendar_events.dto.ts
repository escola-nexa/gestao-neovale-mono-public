import { PartialType } from '@nestjs/mapped-types';
import { CreateCalendarEventsDto } from './create-calendar_events.dto';

export class UpdateCalendarEventsDto extends PartialType(CreateCalendarEventsDto) {}
