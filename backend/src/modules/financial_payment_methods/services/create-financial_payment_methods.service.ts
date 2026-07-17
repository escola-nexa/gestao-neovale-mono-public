import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPaymentMethods } from '../entities/financial_payment_methods.entity';
import { CreateFinancialPaymentMethodsDto } from '../dto/create-financial_payment_methods.dto';

@Injectable()
export class CreateFinancialPaymentMethodsService {
  constructor(
    @InjectRepository(FinancialPaymentMethods)
    private readonly repository: Repository<FinancialPaymentMethods>,
  ) {}

  async execute(dto: CreateFinancialPaymentMethodsDto, organizationId: string): Promise<FinancialPaymentMethods> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
