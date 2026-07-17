import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrSettings } from '../entities/hr_settings.entity';

@Injectable()
export class FindHrSettingsService {
  constructor(
    @InjectRepository(HrSettings)
    private readonly repository: Repository<HrSettings>,
  ) {}

  async findAll(organizationId: string): Promise<HrSettings[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<HrSettings | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
