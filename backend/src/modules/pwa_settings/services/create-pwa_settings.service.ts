import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PwaSettings } from '../entities/pwa_settings.entity';
import { CreatePwaSettingsDto } from '../dto/create-pwa_settings.dto';

@Injectable()
export class CreatePwaSettingsService {
  constructor(
    @InjectRepository(PwaSettings)
    private readonly repository: Repository<PwaSettings>,
  ) {}

  async execute(dto: CreatePwaSettingsDto, organizationId: string): Promise<PwaSettings> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
