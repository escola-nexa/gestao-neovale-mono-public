import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPaymentBatchItems } from '../entities/financial_payment_batch_items.entity';

@Injectable()
export class FindFinancialPaymentBatchItemsService {
  constructor(
    @InjectRepository(FinancialPaymentBatchItems)
    private readonly repository: Repository<FinancialPaymentBatchItems>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialPaymentBatchItems[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialPaymentBatchItems | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
