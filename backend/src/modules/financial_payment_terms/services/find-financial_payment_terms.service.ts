import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPaymentTerms } from '../entities/financial_payment_terms.entity';

@Injectable()
export class FindFinancialPaymentTermsService {
  constructor(
    @InjectRepository(FinancialPaymentTerms)
    private readonly repository: Repository<FinancialPaymentTerms>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialPaymentTerms[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialPaymentTerms | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
