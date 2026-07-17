import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPaymentBatches } from '../entities/financial_payment_batches.entity';

@Injectable()
export class DeleteFinancialPaymentBatchesService {
  constructor(
    @InjectRepository(FinancialPaymentBatches)
    private readonly repository: Repository<FinancialPaymentBatches>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
