import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialDocumentTypes } from '../entities/financial_document_types.entity';
import { CreateFinancialDocumentTypesDto } from '../dto/create-financial_document_types.dto';

@Injectable()
export class CreateFinancialDocumentTypesService {
  constructor(
    @InjectRepository(FinancialDocumentTypes)
    private readonly repository: Repository<FinancialDocumentTypes>,
  ) {}

  async execute(dto: CreateFinancialDocumentTypesDto, organizationId: string): Promise<FinancialDocumentTypes> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
