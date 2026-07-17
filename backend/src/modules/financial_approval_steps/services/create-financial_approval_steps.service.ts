import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialApprovalSteps } from '../entities/financial_approval_steps.entity';
import { CreateFinancialApprovalStepsDto } from '../dto/create-financial_approval_steps.dto';

@Injectable()
export class CreateFinancialApprovalStepsService {
  constructor(
    @InjectRepository(FinancialApprovalSteps)
    private readonly repository: Repository<FinancialApprovalSteps>,
  ) {}

  async execute(dto: CreateFinancialApprovalStepsDto, organizationId: string): Promise<FinancialApprovalSteps> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
