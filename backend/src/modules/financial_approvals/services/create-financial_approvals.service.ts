import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialApprovals } from '../entities/financial_approvals.entity';
import { CreateFinancialApprovalsDto } from '../dto/create-financial_approvals.dto';

@Injectable()
export class CreateFinancialApprovalsService {
  constructor(
    @InjectRepository(FinancialApprovals)
    private readonly repository: Repository<FinancialApprovals>,
  ) {}

  async execute(dto: CreateFinancialApprovalsDto, organizationId: string): Promise<FinancialApprovals> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
