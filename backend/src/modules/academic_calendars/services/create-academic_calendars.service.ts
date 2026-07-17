import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademicCalendars } from '../entities/academic_calendars.entity';
import { CreateAcademicCalendarsDto } from '../dto/create-academic_calendars.dto';

@Injectable()
export class CreateAcademicCalendarsService {
  constructor(
    @InjectRepository(AcademicCalendars)
    private readonly repository: Repository<AcademicCalendars>,
  ) {}

  async execute(dto: CreateAcademicCalendarsDto, organizationId: string): Promise<AcademicCalendars> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
