import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPeriodClosures } from '../entities/financial_period_closures.entity';

@Injectable()
export class FindFinancialPeriodClosuresService {
  constructor(
    @InjectRepository(FinancialPeriodClosures)
    private readonly repository: Repository<FinancialPeriodClosures>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialPeriodClosures[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialPeriodClosures | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
