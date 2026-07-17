import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubstitutionSettings } from '../entities/substitution_settings.entity';

@Injectable()
export class DeleteSubstitutionSettingsService {
  constructor(
    @InjectRepository(SubstitutionSettings)
    private readonly repository: Repository<SubstitutionSettings>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
