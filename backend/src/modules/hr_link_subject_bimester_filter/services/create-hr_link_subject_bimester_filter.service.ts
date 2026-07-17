import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrLinkSubjectBimesterFilter } from '../entities/hr_link_subject_bimester_filter.entity';
import { CreateHrLinkSubjectBimesterFilterDto } from '../dto/create-hr_link_subject_bimester_filter.dto';

@Injectable()
export class CreateHrLinkSubjectBimesterFilterService {
  constructor(
    @InjectRepository(HrLinkSubjectBimesterFilter)
    private readonly repository: Repository<HrLinkSubjectBimesterFilter>,
  ) {}

  async execute(dto: CreateHrLinkSubjectBimesterFilterDto, organizationId: string): Promise<HrLinkSubjectBimesterFilter> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
