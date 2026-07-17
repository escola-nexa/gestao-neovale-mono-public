import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialDocumentTypes } from '../entities/financial_document_types.entity';

@Injectable()
export class DeleteFinancialDocumentTypesService {
  constructor(
    @InjectRepository(FinancialDocumentTypes)
    private readonly repository: Repository<FinancialDocumentTypes>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
