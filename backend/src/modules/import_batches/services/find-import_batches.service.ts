import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImportBatches } from '../entities/import_batches.entity';

@Injectable()
export class FindImportBatchesService {
  constructor(
    @InjectRepository(ImportBatches)
    private readonly repository: Repository<ImportBatches>,
  ) {}

  async findAll(organizationId: string): Promise<ImportBatches[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<ImportBatches | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
