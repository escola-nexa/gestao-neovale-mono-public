import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialApprovals } from '../entities/financial_approvals.entity';

@Injectable()
export class DeleteFinancialApprovalsService {
  constructor(
    @InjectRepository(FinancialApprovals)
    private readonly repository: Repository<FinancialApprovals>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
