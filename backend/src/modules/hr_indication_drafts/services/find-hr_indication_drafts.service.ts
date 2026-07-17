import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrIndicationDrafts } from '../entities/hr_indication_drafts.entity';

@Injectable()
export class FindHrIndicationDraftsService {
  constructor(
    @InjectRepository(HrIndicationDrafts)
    private readonly repository: Repository<HrIndicationDrafts>,
  ) {}

  async findAll(organizationId: string): Promise<HrIndicationDrafts[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<HrIndicationDrafts | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
