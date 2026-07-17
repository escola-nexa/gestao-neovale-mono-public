import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrSettings } from '../entities/hr_settings.entity';
import { CreateHrSettingsDto } from '../dto/create-hr_settings.dto';

@Injectable()
export class CreateHrSettingsService {
  constructor(
    @InjectRepository(HrSettings)
    private readonly repository: Repository<HrSettings>,
  ) {}

  async execute(dto: CreateHrSettingsDto, organizationId: string): Promise<HrSettings> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
