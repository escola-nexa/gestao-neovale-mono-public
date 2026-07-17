import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademicCalendars } from '../entities/academic_calendars.entity';

@Injectable()
export class FindAcademicCalendarsService {
  constructor(
    @InjectRepository(AcademicCalendars)
    private readonly repository: Repository<AcademicCalendars>,
  ) {}

  async findAll(organizationId: string, status?: string): Promise<AcademicCalendars[]> {
    const where: any = { organizationId };
    if (status) where.status = status;
    return this.repository.find({ where });
  }

  async findOne(id: string, organizationId: string): Promise<AcademicCalendars | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
