import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialSettingsAudit } from '../entities/financial_settings_audit.entity';
import { UpdateFinancialSettingsAuditDto } from '../dto/update-financial_settings_audit.dto';

@Injectable()
export class UpdateFinancialSettingsAuditService {
  constructor(
    @InjectRepository(FinancialSettingsAudit)
    private readonly repository: Repository<FinancialSettingsAudit>,
  ) {}

  async execute(id: string, dto: UpdateFinancialSettingsAuditDto, organizationId: string): Promise<FinancialSettingsAudit> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
