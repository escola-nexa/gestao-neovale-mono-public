import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialApprovalSteps } from '../entities/financial_approval_steps.entity';

@Injectable()
export class DeleteFinancialApprovalStepsService {
  constructor(
    @InjectRepository(FinancialApprovalSteps)
    private readonly repository: Repository<FinancialApprovalSteps>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
