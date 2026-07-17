import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialApprovalLimits } from '../entities/financial_approval_limits.entity';
import { UpdateFinancialApprovalLimitsDto } from '../dto/update-financial_approval_limits.dto';

@Injectable()
export class UpdateFinancialApprovalLimitsService {
  constructor(
    @InjectRepository(FinancialApprovalLimits)
    private readonly repository: Repository<FinancialApprovalLimits>,
  ) {}

  async execute(id: string, dto: UpdateFinancialApprovalLimitsDto, organizationId: string): Promise<FinancialApprovalLimits> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
