import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrSchoolIndications } from '../entities/hr_school_indications.entity';

@Injectable()
export class FindHrSchoolIndicationsService {
  constructor(
    @InjectRepository(HrSchoolIndications)
    private readonly repository: Repository<HrSchoolIndications>,
  ) {}

  async findAll(organizationId: string): Promise<HrSchoolIndications[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<HrSchoolIndications | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
