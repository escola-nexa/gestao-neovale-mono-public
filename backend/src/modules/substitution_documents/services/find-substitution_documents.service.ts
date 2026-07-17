import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubstitutionDocuments } from '../entities/substitution_documents.entity';

@Injectable()
export class FindSubstitutionDocumentsService {
  constructor(
    @InjectRepository(SubstitutionDocuments)
    private readonly repository: Repository<SubstitutionDocuments>,
  ) {}

  async findAll(organizationId: string): Promise<SubstitutionDocuments[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<SubstitutionDocuments | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
