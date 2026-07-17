import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolVisits } from '../entities/school_visits.entity';
import { CreateSchoolVisitsDto } from '../dto/create-school_visits.dto';

@Injectable()
export class CreateSchoolVisitsService {
  constructor(
    @InjectRepository(SchoolVisits)
    private readonly repository: Repository<SchoolVisits>,
  ) {}

  async execute(dto: CreateSchoolVisitsDto, organizationId: string): Promise<SchoolVisits> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
