import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialSettings } from '../entities/financial_settings.entity';

@Injectable()
export class DeleteFinancialSettingsService {
  constructor(
    @InjectRepository(FinancialSettings)
    private readonly repository: Repository<FinancialSettings>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
