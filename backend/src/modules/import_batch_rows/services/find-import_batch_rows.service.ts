import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImportBatchRows } from '../entities/import_batch_rows.entity';

@Injectable()
export class FindImportBatchRowsService {
  constructor(
    @InjectRepository(ImportBatchRows)
    private readonly repository: Repository<ImportBatchRows>,
  ) {}

  async findAll(organizationId: string): Promise<ImportBatchRows[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<ImportBatchRows | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
