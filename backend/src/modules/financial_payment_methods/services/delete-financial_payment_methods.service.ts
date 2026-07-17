import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPaymentMethods } from '../entities/financial_payment_methods.entity';

@Injectable()
export class DeleteFinancialPaymentMethodsService {
  constructor(
    @InjectRepository(FinancialPaymentMethods)
    private readonly repository: Repository<FinancialPaymentMethods>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
