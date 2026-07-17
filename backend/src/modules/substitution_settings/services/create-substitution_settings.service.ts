import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubstitutionSettings } from '../entities/substitution_settings.entity';
import { CreateSubstitutionSettingsDto } from '../dto/create-substitution_settings.dto';

@Injectable()
export class CreateSubstitutionSettingsService {
  constructor(
    @InjectRepository(SubstitutionSettings)
    private readonly repository: Repository<SubstitutionSettings>,
  ) {}

  async execute(dto: CreateSubstitutionSettingsDto, organizationId: string): Promise<SubstitutionSettings> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
