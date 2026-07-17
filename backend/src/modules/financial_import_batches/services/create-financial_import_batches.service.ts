import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialImportBatches } from '../entities/financial_import_batches.entity';
import { CreateFinancialImportBatchesDto } from '../dto/create-financial_import_batches.dto';

@Injectable()
export class CreateFinancialImportBatchesService {
  constructor(
    @InjectRepository(FinancialImportBatches)
    private readonly repository: Repository<FinancialImportBatches>,
  ) {}

  async execute(dto: CreateFinancialImportBatchesDto, organizationId: string): Promise<FinancialImportBatches> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
