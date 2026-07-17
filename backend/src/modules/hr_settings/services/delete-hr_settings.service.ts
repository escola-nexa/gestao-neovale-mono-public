import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrSettings } from '../entities/hr_settings.entity';

@Injectable()
export class DeleteHrSettingsService {
  constructor(
    @InjectRepository(HrSettings)
    private readonly repository: Repository<HrSettings>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
