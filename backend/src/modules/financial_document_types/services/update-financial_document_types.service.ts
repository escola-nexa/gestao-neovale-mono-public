import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialDocumentTypes } from '../entities/financial_document_types.entity';
import { UpdateFinancialDocumentTypesDto } from '../dto/update-financial_document_types.dto';

@Injectable()
export class UpdateFinancialDocumentTypesService {
  constructor(
    @InjectRepository(FinancialDocumentTypes)
    private readonly repository: Repository<FinancialDocumentTypes>,
  ) {}

  async execute(id: string, dto: UpdateFinancialDocumentTypesDto, organizationId: string): Promise<FinancialDocumentTypes> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
