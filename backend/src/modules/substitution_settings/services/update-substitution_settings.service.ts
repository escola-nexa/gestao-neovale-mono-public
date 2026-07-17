import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubstitutionSettings } from '../entities/substitution_settings.entity';
import { UpdateSubstitutionSettingsDto } from '../dto/update-substitution_settings.dto';

@Injectable()
export class UpdateSubstitutionSettingsService {
  constructor(
    @InjectRepository(SubstitutionSettings)
    private readonly repository: Repository<SubstitutionSettings>,
  ) {}

  async execute(id: string, dto: UpdateSubstitutionSettingsDto, organizationId: string): Promise<SubstitutionSettings> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
