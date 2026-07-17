import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialApprovalLimits } from '../entities/financial_approval_limits.entity';
import { CreateFinancialApprovalLimitsDto } from '../dto/create-financial_approval_limits.dto';

@Injectable()
export class CreateFinancialApprovalLimitsService {
  constructor(
    @InjectRepository(FinancialApprovalLimits)
    private readonly repository: Repository<FinancialApprovalLimits>,
  ) {}

  async execute(dto: CreateFinancialApprovalLimitsDto, organizationId: string): Promise<FinancialApprovalLimits> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
