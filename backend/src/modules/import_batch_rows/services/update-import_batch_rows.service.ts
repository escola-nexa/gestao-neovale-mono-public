import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImportBatchRows } from '../entities/import_batch_rows.entity';
import { UpdateImportBatchRowsDto } from '../dto/update-import_batch_rows.dto';

@Injectable()
export class UpdateImportBatchRowsService {
  constructor(
    @InjectRepository(ImportBatchRows)
    private readonly repository: Repository<ImportBatchRows>,
  ) {}

  async execute(id: string, dto: UpdateImportBatchRowsDto, organizationId: string): Promise<ImportBatchRows> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
