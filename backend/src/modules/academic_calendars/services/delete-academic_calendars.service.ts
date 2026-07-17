import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademicCalendars } from '../entities/academic_calendars.entity';

@Injectable()
export class DeleteAcademicCalendarsService {
  constructor(
    @InjectRepository(AcademicCalendars)
    private readonly repository: Repository<AcademicCalendars>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
