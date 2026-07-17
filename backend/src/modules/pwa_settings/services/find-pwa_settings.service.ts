import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PwaSettings } from '../entities/pwa_settings.entity';

@Injectable()
export class FindPwaSettingsService {
  constructor(
    @InjectRepository(PwaSettings)
    private readonly repository: Repository<PwaSettings>,
  ) {}

  async findAll(organizationId: string): Promise<PwaSettings[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<PwaSettings | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
