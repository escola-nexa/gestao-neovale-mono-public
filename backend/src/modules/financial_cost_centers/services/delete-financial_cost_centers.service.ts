import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialCostCenters } from '../entities/financial_cost_centers.entity';

@Injectable()
export class DeleteFinancialCostCentersService {
  constructor(
    @InjectRepository(FinancialCostCenters)
    private readonly repository: Repository<FinancialCostCenters>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
