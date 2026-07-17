import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalendarEvents } from '../entities/calendar_events.entity';

@Injectable()
export class FindCalendarEventsService {
  constructor(
    @InjectRepository(CalendarEvents)
    private readonly repository: Repository<CalendarEvents>,
  ) {}

  async findAll(organizationId: string, calendarId?: string): Promise<CalendarEvents[]> {
    const where: any = { organizationId };
    if (calendarId) where.calendarId = calendarId;
    return this.repository.find({ where, order: { eventDate: 'ASC' } });
  }

  async findOne(id: string, organizationId: string): Promise<CalendarEvents | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
