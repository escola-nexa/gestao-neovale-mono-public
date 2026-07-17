import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImportBatches } from '../entities/import_batches.entity';
import { UpdateImportBatchesDto } from '../dto/update-import_batches.dto';

@Injectable()
export class UpdateImportBatchesService {
  constructor(
    @InjectRepository(ImportBatches)
    private readonly repository: Repository<ImportBatches>,
  ) {}

  async execute(id: string, dto: UpdateImportBatchesDto, organizationId: string): Promise<ImportBatches> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
