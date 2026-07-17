import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPayments } from '../entities/financial_payments.entity';

@Injectable()
export class DeleteFinancialPaymentsService {
  constructor(
    @InjectRepository(FinancialPayments)
    private readonly repository: Repository<FinancialPayments>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
