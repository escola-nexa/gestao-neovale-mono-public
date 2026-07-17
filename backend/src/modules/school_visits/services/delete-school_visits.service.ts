import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolVisits } from '../entities/school_visits.entity';

@Injectable()
export class DeleteSchoolVisitsService {
  constructor(
    @InjectRepository(SchoolVisits)
    private readonly repository: Repository<SchoolVisits>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
