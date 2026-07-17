import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialCostCenters } from '../entities/financial_cost_centers.entity';
import { CreateFinancialCostCentersDto } from '../dto/create-financial_cost_centers.dto';

@Injectable()
export class CreateFinancialCostCentersService {
  constructor(
    @InjectRepository(FinancialCostCenters)
    private readonly repository: Repository<FinancialCostCenters>,
  ) {}

  async execute(dto: CreateFinancialCostCentersDto, organizationId: string): Promise<FinancialCostCenters> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
