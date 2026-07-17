import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPaymentBatchItems } from '../entities/financial_payment_batch_items.entity';

@Injectable()
export class DeleteFinancialPaymentBatchItemsService {
  constructor(
    @InjectRepository(FinancialPaymentBatchItems)
    private readonly repository: Repository<FinancialPaymentBatchItems>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
