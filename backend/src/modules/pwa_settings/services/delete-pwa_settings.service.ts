import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PwaSettings } from '../entities/pwa_settings.entity';

@Injectable()
export class DeletePwaSettingsService {
  constructor(
    @InjectRepository(PwaSettings)
    private readonly repository: Repository<PwaSettings>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
