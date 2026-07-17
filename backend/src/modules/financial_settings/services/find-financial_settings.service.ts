import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialSettings } from '../entities/financial_settings.entity';

@Injectable()
export class FindFinancialSettingsService {
  constructor(
    @InjectRepository(FinancialSettings)
    private readonly repository: Repository<FinancialSettings>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialSettings[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialSettings | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
