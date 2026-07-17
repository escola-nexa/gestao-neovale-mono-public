import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialParties } from '../entities/financial_parties.entity';

@Injectable()
export class FindFinancialPartiesService {
  constructor(
    @InjectRepository(FinancialParties)
    private readonly repository: Repository<FinancialParties>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialParties[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialParties | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
