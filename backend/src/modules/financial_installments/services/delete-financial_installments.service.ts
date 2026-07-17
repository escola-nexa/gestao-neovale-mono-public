import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialInstallments } from '../entities/financial_installments.entity';

@Injectable()
export class DeleteFinancialInstallmentsService {
  constructor(
    @InjectRepository(FinancialInstallments)
    private readonly repository: Repository<FinancialInstallments>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
