import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrLinkSubjectBimesterFilter } from '../entities/hr_link_subject_bimester_filter.entity';

@Injectable()
export class DeleteHrLinkSubjectBimesterFilterService {
  constructor(
    @InjectRepository(HrLinkSubjectBimesterFilter)
    private readonly repository: Repository<HrLinkSubjectBimesterFilter>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
