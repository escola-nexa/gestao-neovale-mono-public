import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PwaSettings } from '../entities/pwa_settings.entity';
import { UpdatePwaSettingsDto } from '../dto/update-pwa_settings.dto';

@Injectable()
export class UpdatePwaSettingsService {
  constructor(
    @InjectRepository(PwaSettings)
    private readonly repository: Repository<PwaSettings>,
  ) {}

  async execute(id: string, dto: UpdatePwaSettingsDto, organizationId: string): Promise<PwaSettings> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
