import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorDocuments } from '../entities/professor_documents.entity';

@Injectable()
export class FindProfessorDocumentsService {
  constructor(
    @InjectRepository(ProfessorDocuments)
    private readonly repository: Repository<ProfessorDocuments>,
  ) {}

  async findAll(organizationId: string): Promise<ProfessorDocuments[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<ProfessorDocuments | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
