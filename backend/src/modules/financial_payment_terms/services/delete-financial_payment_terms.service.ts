import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPaymentTerms } from '../entities/financial_payment_terms.entity';

@Injectable()
export class DeleteFinancialPaymentTermsService {
  constructor(
    @InjectRepository(FinancialPaymentTerms)
    private readonly repository: Repository<FinancialPaymentTerms>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
