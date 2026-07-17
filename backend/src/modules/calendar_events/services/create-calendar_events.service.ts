import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalendarEvents } from '../entities/calendar_events.entity';
import { CreateCalendarEventsDto } from '../dto/create-calendar_events.dto';

@Injectable()
export class CreateCalendarEventsService {
  constructor(
    @InjectRepository(CalendarEvents)
    private readonly repository: Repository<CalendarEvents>,
  ) {}

  async execute(dto: CreateCalendarEventsDto, organizationId: string): Promise<CalendarEvents> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
