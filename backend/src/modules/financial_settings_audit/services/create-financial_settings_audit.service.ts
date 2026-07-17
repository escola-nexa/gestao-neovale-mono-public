import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialSettingsAudit } from '../entities/financial_settings_audit.entity';
import { CreateFinancialSettingsAuditDto } from '../dto/create-financial_settings_audit.dto';

@Injectable()
export class CreateFinancialSettingsAuditService {
  constructor(
    @InjectRepository(FinancialSettingsAudit)
    private readonly repository: Repository<FinancialSettingsAudit>,
  ) {}

  async execute(dto: CreateFinancialSettingsAuditDto, organizationId: string): Promise<FinancialSettingsAudit> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
