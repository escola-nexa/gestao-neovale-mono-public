import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialSettings } from '../entities/financial_settings.entity';
import { UpdateFinancialSettingsDto } from '../dto/update-financial_settings.dto';

@Injectable()
export class UpdateFinancialSettingsService {
  constructor(
    @InjectRepository(FinancialSettings)
    private readonly repository: Repository<FinancialSettings>,
  ) {}

  async execute(id: string, dto: UpdateFinancialSettingsDto, organizationId: string): Promise<FinancialSettings> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
