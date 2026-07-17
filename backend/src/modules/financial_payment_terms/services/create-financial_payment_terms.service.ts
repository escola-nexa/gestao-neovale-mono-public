import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPaymentTerms } from '../entities/financial_payment_terms.entity';
import { CreateFinancialPaymentTermsDto } from '../dto/create-financial_payment_terms.dto';

@Injectable()
export class CreateFinancialPaymentTermsService {
  constructor(
    @InjectRepository(FinancialPaymentTerms)
    private readonly repository: Repository<FinancialPaymentTerms>,
  ) {}

  async execute(dto: CreateFinancialPaymentTermsDto, organizationId: string): Promise<FinancialPaymentTerms> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
