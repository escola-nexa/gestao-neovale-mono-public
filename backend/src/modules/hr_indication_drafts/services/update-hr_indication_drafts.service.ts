import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrIndicationDrafts } from '../entities/hr_indication_drafts.entity';
import { UpdateHrIndicationDraftsDto } from '../dto/update-hr_indication_drafts.dto';

@Injectable()
export class UpdateHrIndicationDraftsService {
  constructor(
    @InjectRepository(HrIndicationDrafts)
    private readonly repository: Repository<HrIndicationDrafts>,
  ) {}

  async execute(id: string, dto: UpdateHrIndicationDraftsDto, organizationId: string): Promise<HrIndicationDrafts> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
