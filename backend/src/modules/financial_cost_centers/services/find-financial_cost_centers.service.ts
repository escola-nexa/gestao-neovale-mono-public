import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialCostCenters } from '../entities/financial_cost_centers.entity';

@Injectable()
export class FindFinancialCostCentersService {
  constructor(
    @InjectRepository(FinancialCostCenters)
    private readonly repository: Repository<FinancialCostCenters>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialCostCenters[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialCostCenters | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
