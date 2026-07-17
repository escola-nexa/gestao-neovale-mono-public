import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPaymentTerms } from '../entities/financial_payment_terms.entity';
import { UpdateFinancialPaymentTermsDto } from '../dto/update-financial_payment_terms.dto';

@Injectable()
export class UpdateFinancialPaymentTermsService {
  constructor(
    @InjectRepository(FinancialPaymentTerms)
    private readonly repository: Repository<FinancialPaymentTerms>,
  ) {}

  async execute(id: string, dto: UpdateFinancialPaymentTermsDto, organizationId: string): Promise<FinancialPaymentTerms> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
