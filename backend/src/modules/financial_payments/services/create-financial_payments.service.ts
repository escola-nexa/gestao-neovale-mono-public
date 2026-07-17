import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPayments } from '../entities/financial_payments.entity';
import { CreateFinancialPaymentsDto } from '../dto/create-financial_payments.dto';

@Injectable()
export class CreateFinancialPaymentsService {
  constructor(
    @InjectRepository(FinancialPayments)
    private readonly repository: Repository<FinancialPayments>,
  ) {}

  async execute(dto: CreateFinancialPaymentsDto, organizationId: string): Promise<FinancialPayments> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
