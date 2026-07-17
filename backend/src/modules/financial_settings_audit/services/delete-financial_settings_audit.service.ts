import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialSettingsAudit } from '../entities/financial_settings_audit.entity';

@Injectable()
export class DeleteFinancialSettingsAuditService {
  constructor(
    @InjectRepository(FinancialSettingsAudit)
    private readonly repository: Repository<FinancialSettingsAudit>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
