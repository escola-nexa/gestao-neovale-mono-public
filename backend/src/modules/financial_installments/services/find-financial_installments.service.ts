import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialInstallments } from '../entities/financial_installments.entity';

@Injectable()
export class FindFinancialInstallmentsService {
  constructor(
    @InjectRepository(FinancialInstallments)
    private readonly repository: Repository<FinancialInstallments>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialInstallments[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialInstallments | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
