import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialReconciliations } from '../entities/financial_reconciliations.entity';
import { CreateFinancialReconciliationsDto } from '../dto/create-financial_reconciliations.dto';

@Injectable()
export class CreateFinancialReconciliationsService {
  constructor(
    @InjectRepository(FinancialReconciliations)
    private readonly repository: Repository<FinancialReconciliations>,
  ) {}

  async execute(dto: CreateFinancialReconciliationsDto, organizationId: string): Promise<FinancialReconciliations> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
