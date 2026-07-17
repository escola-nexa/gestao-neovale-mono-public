import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrIndicationDrafts } from '../entities/hr_indication_drafts.entity';

@Injectable()
export class DeleteHrIndicationDraftsService {
  constructor(
    @InjectRepository(HrIndicationDrafts)
    private readonly repository: Repository<HrIndicationDrafts>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
