import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialDocumentTypes } from '../entities/financial_document_types.entity';

@Injectable()
export class FindFinancialDocumentTypesService {
  constructor(
    @InjectRepository(FinancialDocumentTypes)
    private readonly repository: Repository<FinancialDocumentTypes>,
  ) {}

  async findAll(organizationId: string): Promise<FinancialDocumentTypes[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FinancialDocumentTypes | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
