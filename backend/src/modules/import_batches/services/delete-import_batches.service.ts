import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImportBatches } from '../entities/import_batches.entity';

@Injectable()
export class DeleteImportBatchesService {
  constructor(
    @InjectRepository(ImportBatches)
    private readonly repository: Repository<ImportBatches>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
