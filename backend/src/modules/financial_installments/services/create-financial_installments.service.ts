import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialInstallments } from '../entities/financial_installments.entity';
import { CreateFinancialInstallmentsDto } from '../dto/create-financial_installments.dto';

@Injectable()
export class CreateFinancialInstallmentsService {
  constructor(
    @InjectRepository(FinancialInstallments)
    private readonly repository: Repository<FinancialInstallments>,
  ) {}

  async execute(dto: CreateFinancialInstallmentsDto, organizationId: string): Promise<FinancialInstallments> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
