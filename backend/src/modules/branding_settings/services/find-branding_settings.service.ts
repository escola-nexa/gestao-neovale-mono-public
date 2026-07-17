import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BrandingSettings } from '../entities/branding_settings.entity';

@Injectable()
export class FindBrandingSettingsService {
  constructor(
    @InjectRepository(BrandingSettings)
    private readonly repository: Repository<BrandingSettings>,
  ) {}

  async findAll(organizationId: string): Promise<BrandingSettings[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<BrandingSettings | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
