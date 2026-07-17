import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPaymentMethods } from '../entities/financial_payment_methods.entity';
import { UpdateFinancialPaymentMethodsDto } from '../dto/update-financial_payment_methods.dto';

@Injectable()
export class UpdateFinancialPaymentMethodsService {
  constructor(
    @InjectRepository(FinancialPaymentMethods)
    private readonly repository: Repository<FinancialPaymentMethods>,
  ) {}

  async execute(id: string, dto: UpdateFinancialPaymentMethodsDto, organizationId: string): Promise<FinancialPaymentMethods> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
