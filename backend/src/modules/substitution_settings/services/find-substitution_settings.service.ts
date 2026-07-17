import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubstitutionSettings } from '../entities/substitution_settings.entity';

@Injectable()
export class FindSubstitutionSettingsService {
  constructor(
    @InjectRepository(SubstitutionSettings)
    private readonly repository: Repository<SubstitutionSettings>,
  ) {}

  async findAll(organizationId: string): Promise<SubstitutionSettings[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<SubstitutionSettings | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
