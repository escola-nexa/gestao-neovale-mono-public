import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrLinkSubjectBimesterFilter } from '../entities/hr_link_subject_bimester_filter.entity';

@Injectable()
export class FindHrLinkSubjectBimesterFilterService {
  constructor(
    @InjectRepository(HrLinkSubjectBimesterFilter)
    private readonly repository: Repository<HrLinkSubjectBimesterFilter>,
  ) {}

  async findAll(organizationId: string): Promise<HrLinkSubjectBimesterFilter[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<HrLinkSubjectBimesterFilter | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
