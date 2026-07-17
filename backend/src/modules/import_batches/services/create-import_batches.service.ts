import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImportBatches } from '../entities/import_batches.entity';
import { CreateImportBatchesDto } from '../dto/create-import_batches.dto';

@Injectable()
export class CreateImportBatchesService {
  constructor(
    @InjectRepository(ImportBatches)
    private readonly repository: Repository<ImportBatches>,
  ) {}

  async execute(dto: CreateImportBatchesDto, organizationId: string): Promise<ImportBatches> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
