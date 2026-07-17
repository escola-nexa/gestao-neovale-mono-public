import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolVisitSchools } from '../entities/school_visit_schools.entity';

@Injectable()
export class FindSchoolVisitSchoolsService {
  constructor(
    @InjectRepository(SchoolVisitSchools)
    private readonly repository: Repository<SchoolVisitSchools>,
  ) {}

  async findAll(organizationId: string): Promise<SchoolVisitSchools[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<SchoolVisitSchools | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
