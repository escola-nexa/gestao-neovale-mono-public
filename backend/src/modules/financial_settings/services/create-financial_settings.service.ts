import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialSettings } from '../entities/financial_settings.entity';
import { CreateFinancialSettingsDto } from '../dto/create-financial_settings.dto';

@Injectable()
export class CreateFinancialSettingsService {
  constructor(
    @InjectRepository(FinancialSettings)
    private readonly repository: Repository<FinancialSettings>,
  ) {}

  async execute(dto: CreateFinancialSettingsDto, organizationId: string): Promise<FinancialSettings> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
