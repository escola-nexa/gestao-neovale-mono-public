import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnesignalSettings } from '../entities/onesignal_settings.entity';
import { CreateOnesignalSettingsDto } from '../dto/create-onesignal_settings.dto';

@Injectable()
export class CreateOnesignalSettingsService {
  constructor(
    @InjectRepository(OnesignalSettings)
    private readonly repository: Repository<OnesignalSettings>,
  ) {}

  async execute(dto: CreateOnesignalSettingsDto, organizationId: string): Promise<OnesignalSettings> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
