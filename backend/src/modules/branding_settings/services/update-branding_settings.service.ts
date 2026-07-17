import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BrandingSettings } from '../entities/branding_settings.entity';
import { UpdateBrandingSettingsDto } from '../dto/update-branding_settings.dto';

@Injectable()
export class UpdateBrandingSettingsService {
  constructor(
    @InjectRepository(BrandingSettings)
    private readonly repository: Repository<BrandingSettings>,
  ) {}

  async execute(id: string, dto: UpdateBrandingSettingsDto, organizationId: string): Promise<BrandingSettings> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
