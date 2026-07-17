import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnesignalSettings } from '../entities/onesignal_settings.entity';

@Injectable()
export class DeleteOnesignalSettingsService {
  constructor(
    @InjectRepository(OnesignalSettings)
    private readonly repository: Repository<OnesignalSettings>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
