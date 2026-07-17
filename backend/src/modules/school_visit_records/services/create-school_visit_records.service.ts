import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolVisitRecords } from '../entities/school_visit_records.entity';
import { CreateSchoolVisitRecordsDto } from '../dto/create-school_visit_records.dto';

@Injectable()
export class CreateSchoolVisitRecordsService {
  constructor(
    @InjectRepository(SchoolVisitRecords)
    private readonly repository: Repository<SchoolVisitRecords>,
  ) {}

  async execute(dto: CreateSchoolVisitRecordsDto, organizationId: string): Promise<SchoolVisitRecords> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
