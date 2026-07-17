import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolVisitSchools } from '../entities/school_visit_schools.entity';
import { UpdateSchoolVisitSchoolsDto } from '../dto/update-school_visit_schools.dto';

@Injectable()
export class UpdateSchoolVisitSchoolsService {
  constructor(
    @InjectRepository(SchoolVisitSchools)
    private readonly repository: Repository<SchoolVisitSchools>,
  ) {}

  async execute(id: string, dto: UpdateSchoolVisitSchoolsDto, organizationId: string): Promise<SchoolVisitSchools> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
