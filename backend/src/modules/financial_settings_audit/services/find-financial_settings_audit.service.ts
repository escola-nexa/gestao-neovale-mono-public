import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialSettingsAudit } from '../entities/financial_settings_audit.entity';

@Injectable()
export class FindFinancialSettingsAuditService {
  constructor(
    @InjectRepository(FinancialSettingsAudit)
    private readonly repository: Repository<FinancialSettingsAudit>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialSettingsAudit[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialSettingsAudit | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
