import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrIndicationDrafts } from '../entities/hr_indication_drafts.entity';
import { CreateHrIndicationDraftsDto } from '../dto/create-hr_indication_drafts.dto';

@Injectable()
export class CreateHrIndicationDraftsService {
  constructor(
    @InjectRepository(HrIndicationDrafts)
    private readonly repository: Repository<HrIndicationDrafts>,
  ) {}

  async execute(dto: CreateHrIndicationDraftsDto, organizationId: string): Promise<HrIndicationDrafts> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
