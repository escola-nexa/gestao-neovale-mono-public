import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPaymentMethods } from '../entities/financial_payment_methods.entity';

@Injectable()
export class FindFinancialPaymentMethodsService {
  constructor(
    @InjectRepository(FinancialPaymentMethods)
    private readonly repository: Repository<FinancialPaymentMethods>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialPaymentMethods[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialPaymentMethods | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
