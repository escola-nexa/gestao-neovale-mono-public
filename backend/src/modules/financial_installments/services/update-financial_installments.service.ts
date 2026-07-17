import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialInstallments } from '../entities/financial_installments.entity';
import { UpdateFinancialInstallmentsDto } from '../dto/update-financial_installments.dto';

@Injectable()
export class UpdateFinancialInstallmentsService {
  constructor(
    @InjectRepository(FinancialInstallments)
    private readonly repository: Repository<FinancialInstallments>,
  ) {}

  async execute(id: string, dto: UpdateFinancialInstallmentsDto, organizationId: string): Promise<FinancialInstallments> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
