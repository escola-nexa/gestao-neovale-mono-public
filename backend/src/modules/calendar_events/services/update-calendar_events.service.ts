import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalendarEvents } from '../entities/calendar_events.entity';
import { UpdateCalendarEventsDto } from '../dto/update-calendar_events.dto';

@Injectable()
export class UpdateCalendarEventsService {
  constructor(
    @InjectRepository(CalendarEvents)
    private readonly repository: Repository<CalendarEvents>,
  ) {}

  async execute(id: string, dto: UpdateCalendarEventsDto, organizationId: string): Promise<CalendarEvents> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
