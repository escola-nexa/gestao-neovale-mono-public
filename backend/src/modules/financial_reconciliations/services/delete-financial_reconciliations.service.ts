import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialReconciliations } from '../entities/financial_reconciliations.entity';

@Injectable()
export class DeleteFinancialReconciliationsService {
  constructor(
    @InjectRepository(FinancialReconciliations)
    private readonly repository: Repository<FinancialReconciliations>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
