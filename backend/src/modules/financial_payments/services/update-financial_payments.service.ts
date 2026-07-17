import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPayments } from '../entities/financial_payments.entity';
import { UpdateFinancialPaymentsDto } from '../dto/update-financial_payments.dto';

@Injectable()
export class UpdateFinancialPaymentsService {
  constructor(
    @InjectRepository(FinancialPayments)
    private readonly repository: Repository<FinancialPayments>,
  ) {}

  async execute(id: string, dto: UpdateFinancialPaymentsDto, organizationId: string): Promise<FinancialPayments> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
