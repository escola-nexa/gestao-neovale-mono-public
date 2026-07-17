import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialApprovalSteps } from '../entities/financial_approval_steps.entity';
import { UpdateFinancialApprovalStepsDto } from '../dto/update-financial_approval_steps.dto';

@Injectable()
export class UpdateFinancialApprovalStepsService {
  constructor(
    @InjectRepository(FinancialApprovalSteps)
    private readonly repository: Repository<FinancialApprovalSteps>,
  ) {}

  async execute(id: string, dto: UpdateFinancialApprovalStepsDto, organizationId: string): Promise<FinancialApprovalSteps> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
