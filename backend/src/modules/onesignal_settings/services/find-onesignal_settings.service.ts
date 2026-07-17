import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnesignalSettings } from '../entities/onesignal_settings.entity';

@Injectable()
export class FindOnesignalSettingsService {
  constructor(
    @InjectRepository(OnesignalSettings)
    private readonly repository: Repository<OnesignalSettings>,
  ) {}

  async findAll(organizationId: string): Promise<OnesignalSettings[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<OnesignalSettings | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
