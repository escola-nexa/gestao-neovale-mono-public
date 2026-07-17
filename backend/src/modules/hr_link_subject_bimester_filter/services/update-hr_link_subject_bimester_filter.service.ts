import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrLinkSubjectBimesterFilter } from '../entities/hr_link_subject_bimester_filter.entity';
import { UpdateHrLinkSubjectBimesterFilterDto } from '../dto/update-hr_link_subject_bimester_filter.dto';

@Injectable()
export class UpdateHrLinkSubjectBimesterFilterService {
  constructor(
    @InjectRepository(HrLinkSubjectBimesterFilter)
    private readonly repository: Repository<HrLinkSubjectBimesterFilter>,
  ) {}

  async execute(id: string, dto: UpdateHrLinkSubjectBimesterFilterDto, organizationId: string): Promise<HrLinkSubjectBimesterFilter> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
