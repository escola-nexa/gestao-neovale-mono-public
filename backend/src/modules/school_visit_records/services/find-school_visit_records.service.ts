import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolVisitRecords } from '../entities/school_visit_records.entity';

@Injectable()
export class FindSchoolVisitRecordsService {
  constructor(
    @InjectRepository(SchoolVisitRecords)
    private readonly repository: Repository<SchoolVisitRecords>,
  ) {}

  async findAll(organizationId: string): Promise<SchoolVisitRecords[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<SchoolVisitRecords | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
