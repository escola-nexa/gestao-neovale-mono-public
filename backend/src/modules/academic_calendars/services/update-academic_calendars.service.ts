import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademicCalendars } from '../entities/academic_calendars.entity';
import { UpdateAcademicCalendarsDto } from '../dto/update-academic_calendars.dto';

@Injectable()
export class UpdateAcademicCalendarsService {
  constructor(
    @InjectRepository(AcademicCalendars)
    private readonly repository: Repository<AcademicCalendars>,
  ) {}

  async execute(id: string, dto: UpdateAcademicCalendarsDto, organizationId: string): Promise<AcademicCalendars> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
