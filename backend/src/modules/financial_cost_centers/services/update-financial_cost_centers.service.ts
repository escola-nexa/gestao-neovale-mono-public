import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialCostCenters } from '../entities/financial_cost_centers.entity';
import { UpdateFinancialCostCentersDto } from '../dto/update-financial_cost_centers.dto';

@Injectable()
export class UpdateFinancialCostCentersService {
  constructor(
    @InjectRepository(FinancialCostCenters)
    private readonly repository: Repository<FinancialCostCenters>,
  ) {}

  async execute(id: string, dto: UpdateFinancialCostCentersDto, organizationId: string): Promise<FinancialCostCenters> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
