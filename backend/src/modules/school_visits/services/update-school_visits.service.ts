import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolVisits } from '../entities/school_visits.entity';
import { UpdateSchoolVisitsDto } from '../dto/update-school_visits.dto';

@Injectable()
export class UpdateSchoolVisitsService {
  constructor(
    @InjectRepository(SchoolVisits)
    private readonly repository: Repository<SchoolVisits>,
  ) {}

  async execute(id: string, dto: UpdateSchoolVisitsDto, organizationId: string): Promise<SchoolVisits> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
