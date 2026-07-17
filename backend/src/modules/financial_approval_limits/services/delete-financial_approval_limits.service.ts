import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialApprovalLimits } from '../entities/financial_approval_limits.entity';

@Injectable()
export class DeleteFinancialApprovalLimitsService {
  constructor(
    @InjectRepository(FinancialApprovalLimits)
    private readonly repository: Repository<FinancialApprovalLimits>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
