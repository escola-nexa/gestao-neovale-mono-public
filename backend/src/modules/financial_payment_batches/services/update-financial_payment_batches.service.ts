import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPaymentBatches } from '../entities/financial_payment_batches.entity';
import { UpdateFinancialPaymentBatchesDto } from '../dto/update-financial_payment_batches.dto';

@Injectable()
export class UpdateFinancialPaymentBatchesService {
  constructor(
    @InjectRepository(FinancialPaymentBatches)
    private readonly repository: Repository<FinancialPaymentBatches>,
  ) {}

  async execute(id: string, dto: UpdateFinancialPaymentBatchesDto, organizationId: string): Promise<FinancialPaymentBatches> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
