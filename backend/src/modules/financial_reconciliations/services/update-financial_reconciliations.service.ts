import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialReconciliations } from '../entities/financial_reconciliations.entity';
import { UpdateFinancialReconciliationsDto } from '../dto/update-financial_reconciliations.dto';

@Injectable()
export class UpdateFinancialReconciliationsService {
  constructor(
    @InjectRepository(FinancialReconciliations)
    private readonly repository: Repository<FinancialReconciliations>,
  ) {}

  async execute(id: string, dto: UpdateFinancialReconciliationsDto, organizationId: string): Promise<FinancialReconciliations> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
