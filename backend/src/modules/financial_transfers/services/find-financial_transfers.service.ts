import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialTransfers } from '../entities/financial_transfers.entity';

@Injectable()
export class FindFinancialTransfersService {
  constructor(
    @InjectRepository(FinancialTransfers)
    private readonly repository: Repository<FinancialTransfers>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialTransfers[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialTransfers | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
