import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPaymentBatches } from '../entities/financial_payment_batches.entity';
import { CreateFinancialPaymentBatchesDto } from '../dto/create-financial_payment_batches.dto';

@Injectable()
export class CreateFinancialPaymentBatchesService {
  constructor(
    @InjectRepository(FinancialPaymentBatches)
    private readonly repository: Repository<FinancialPaymentBatches>,
  ) {}

  async execute(dto: CreateFinancialPaymentBatchesDto, organizationId: string): Promise<FinancialPaymentBatches> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
