import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialImportBatches } from '../entities/financial_import_batches.entity';
import { UpdateFinancialImportBatchesDto } from '../dto/update-financial_import_batches.dto';

@Injectable()
export class UpdateFinancialImportBatchesService {
  constructor(
    @InjectRepository(FinancialImportBatches)
    private readonly repository: Repository<FinancialImportBatches>,
  ) {}

  async execute(id: string, dto: UpdateFinancialImportBatchesDto, organizationId: string): Promise<FinancialImportBatches> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
