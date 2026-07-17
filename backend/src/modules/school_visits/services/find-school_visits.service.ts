import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolVisits } from '../entities/school_visits.entity';

@Injectable()
export class FindSchoolVisitsService {
  constructor(
    @InjectRepository(SchoolVisits)
    private readonly repository: Repository<SchoolVisits>,
  ) {}

  async findAll(organizationId: string): Promise<SchoolVisits[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<SchoolVisits | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
