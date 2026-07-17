import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPaymentBatchItems } from '../entities/financial_payment_batch_items.entity';
import { CreateFinancialPaymentBatchItemsDto } from '../dto/create-financial_payment_batch_items.dto';

@Injectable()
export class CreateFinancialPaymentBatchItemsService {
  constructor(
    @InjectRepository(FinancialPaymentBatchItems)
    private readonly repository: Repository<FinancialPaymentBatchItems>,
  ) {}

  async execute(dto: CreateFinancialPaymentBatchItemsDto, organizationId: string): Promise<FinancialPaymentBatchItems> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
