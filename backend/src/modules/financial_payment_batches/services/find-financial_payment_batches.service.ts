import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPaymentBatches } from '../entities/financial_payment_batches.entity';

@Injectable()
export class FindFinancialPaymentBatchesService {
  constructor(
    @InjectRepository(FinancialPaymentBatches)
    private readonly repository: Repository<FinancialPaymentBatches>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialPaymentBatches[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialPaymentBatches | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
