import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BrandingSettings } from '../entities/branding_settings.entity';
import { CreateBrandingSettingsDto } from '../dto/create-branding_settings.dto';

@Injectable()
export class CreateBrandingSettingsService {
  constructor(
    @InjectRepository(BrandingSettings)
    private readonly repository: Repository<BrandingSettings>,
  ) {}

  async execute(dto: CreateBrandingSettingsDto, organizationId: string): Promise<BrandingSettings> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
