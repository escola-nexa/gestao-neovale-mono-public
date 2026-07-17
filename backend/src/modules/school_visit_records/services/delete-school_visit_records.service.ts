import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolVisitRecords } from '../entities/school_visit_records.entity';

@Injectable()
export class DeleteSchoolVisitRecordsService {
  constructor(
    @InjectRepository(SchoolVisitRecords)
    private readonly repository: Repository<SchoolVisitRecords>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
