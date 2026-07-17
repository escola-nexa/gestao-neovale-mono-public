import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademicBimesters } from '../entities/academic_bimesters.entity';

@Injectable()
export class FindAcademicBimestersService {
  constructor(
    @InjectRepository(AcademicBimesters)
    private readonly repository: Repository<AcademicBimesters>,
  ) {}

  async findAll(organizationId?: string, calendarId?: string): Promise<AcademicBimesters[]> {
    const where: any = {};
    if (calendarId) where.calendarId = calendarId;
    return this.repository.find({ where, order: { number: 'ASC' } as any });
  }

  async findOne(id: string): Promise<AcademicBimesters | null> {
    return this.repository.findOne({ where: { id } });
  }
}
