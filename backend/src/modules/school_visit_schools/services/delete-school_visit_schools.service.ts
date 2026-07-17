import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolVisitSchools } from '../entities/school_visit_schools.entity';

@Injectable()
export class DeleteSchoolVisitSchoolsService {
  constructor(
    @InjectRepository(SchoolVisitSchools)
    private readonly repository: Repository<SchoolVisitSchools>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
