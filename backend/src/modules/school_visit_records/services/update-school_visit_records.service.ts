import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolVisitRecords } from '../entities/school_visit_records.entity';
import { UpdateSchoolVisitRecordsDto } from '../dto/update-school_visit_records.dto';

@Injectable()
export class UpdateSchoolVisitRecordsService {
  constructor(
    @InjectRepository(SchoolVisitRecords)
    private readonly repository: Repository<SchoolVisitRecords>,
  ) {}

  async execute(id: string, dto: UpdateSchoolVisitRecordsDto, organizationId: string): Promise<SchoolVisitRecords> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
