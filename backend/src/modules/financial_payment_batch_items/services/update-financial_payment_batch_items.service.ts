import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPaymentBatchItems } from '../entities/financial_payment_batch_items.entity';
import { UpdateFinancialPaymentBatchItemsDto } from '../dto/update-financial_payment_batch_items.dto';

@Injectable()
export class UpdateFinancialPaymentBatchItemsService {
  constructor(
    @InjectRepository(FinancialPaymentBatchItems)
    private readonly repository: Repository<FinancialPaymentBatchItems>,
  ) {}

  async execute(id: string, dto: UpdateFinancialPaymentBatchItemsDto, organizationId: string): Promise<FinancialPaymentBatchItems> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
