import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolVisitSchools } from '../entities/school_visit_schools.entity';
import { CreateSchoolVisitSchoolsDto } from '../dto/create-school_visit_schools.dto';

@Injectable()
export class CreateSchoolVisitSchoolsService {
  constructor(
    @InjectRepository(SchoolVisitSchools)
    private readonly repository: Repository<SchoolVisitSchools>,
  ) {}

  async execute(dto: CreateSchoolVisitSchoolsDto, organizationId: string): Promise<SchoolVisitSchools> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
