import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubstitutionDocuments } from '../entities/substitution_documents.entity';
import { CreateSubstitutionDocumentsDto } from '../dto/create-substitution_documents.dto';

@Injectable()
export class CreateSubstitutionDocumentsService {
  constructor(
    @InjectRepository(SubstitutionDocuments)
    private readonly repository: Repository<SubstitutionDocuments>,
  ) {}

  async execute(dto: CreateSubstitutionDocumentsDto, organizationId: string): Promise<SubstitutionDocuments> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
