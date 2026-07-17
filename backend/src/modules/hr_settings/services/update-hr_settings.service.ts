import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrSettings } from '../entities/hr_settings.entity';
import { UpdateHrSettingsDto } from '../dto/update-hr_settings.dto';

@Injectable()
export class UpdateHrSettingsService {
  constructor(
    @InjectRepository(HrSettings)
    private readonly repository: Repository<HrSettings>,
  ) {}

  async execute(id: string, dto: UpdateHrSettingsDto, organizationId: string): Promise<HrSettings> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
