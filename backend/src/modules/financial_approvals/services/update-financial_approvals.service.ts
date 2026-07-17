import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialApprovals } from '../entities/financial_approvals.entity';
import { UpdateFinancialApprovalsDto } from '../dto/update-financial_approvals.dto';

@Injectable()
export class UpdateFinancialApprovalsService {
  constructor(
    @InjectRepository(FinancialApprovals)
    private readonly repository: Repository<FinancialApprovals>,
  ) {}

  async execute(id: string, dto: UpdateFinancialApprovalsDto, organizationId: string): Promise<FinancialApprovals> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
