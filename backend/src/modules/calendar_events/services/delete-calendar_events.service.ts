import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalendarEvents } from '../entities/calendar_events.entity';

@Injectable()
export class DeleteCalendarEventsService {
  constructor(
    @InjectRepository(CalendarEvents)
    private readonly repository: Repository<CalendarEvents>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
