import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrSubjectUcpOverrides } from '../entities/hr_subject_ucp_overrides.entity';

@Injectable()
export class FindHrSubjectUcpOverridesService {
  constructor(
    @InjectRepository(HrSubjectUcpOverrides)
    private readonly repository: Repository<HrSubjectUcpOverrides>,
  ) {}

  async findAll(organizationId: string): Promise<HrSubjectUcpOverrides[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<HrSubjectUcpOverrides | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
