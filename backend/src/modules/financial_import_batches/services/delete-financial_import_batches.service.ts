import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialImportBatches } from '../entities/financial_import_batches.entity';

@Injectable()
export class DeleteFinancialImportBatchesService {
  constructor(
    @InjectRepository(FinancialImportBatches)
    private readonly repository: Repository<FinancialImportBatches>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
