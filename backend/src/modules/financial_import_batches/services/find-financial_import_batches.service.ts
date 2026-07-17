import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialImportBatches } from '../entities/financial_import_batches.entity';

@Injectable()
export class FindFinancialImportBatchesService {
  constructor(
    @InjectRepository(FinancialImportBatches)
    private readonly repository: Repository<FinancialImportBatches>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialImportBatches[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialImportBatches | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
