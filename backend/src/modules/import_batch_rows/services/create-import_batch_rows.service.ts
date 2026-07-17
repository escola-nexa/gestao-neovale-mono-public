import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImportBatchRows } from '../entities/import_batch_rows.entity';
import { CreateImportBatchRowsDto } from '../dto/create-import_batch_rows.dto';

@Injectable()
export class CreateImportBatchRowsService {
  constructor(
    @InjectRepository(ImportBatchRows)
    private readonly repository: Repository<ImportBatchRows>,
  ) {}

  async execute(dto: CreateImportBatchRowsDto, organizationId: string): Promise<ImportBatchRows> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
