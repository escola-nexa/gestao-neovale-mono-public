import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImportBatchRows } from '../entities/import_batch_rows.entity';

@Injectable()
export class DeleteImportBatchRowsService {
  constructor(
    @InjectRepository(ImportBatchRows)
    private readonly repository: Repository<ImportBatchRows>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
