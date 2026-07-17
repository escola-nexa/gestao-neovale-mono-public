import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPayments } from '../entities/financial_payments.entity';

@Injectable()
export class FindFinancialPaymentsService {
  constructor(
    @InjectRepository(FinancialPayments)
    private readonly repository: Repository<FinancialPayments>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialPayments[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialPayments | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
