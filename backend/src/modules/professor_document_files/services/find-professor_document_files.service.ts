import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorDocumentFiles } from '../entities/professor_document_files.entity';

@Injectable()
export class FindProfessorDocumentFilesService {
  constructor(
    @InjectRepository(ProfessorDocumentFiles)
    private readonly repository: Repository<ProfessorDocumentFiles>,
  ) {}

  async findAll(organizationId: string): Promise<ProfessorDocumentFiles[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<ProfessorDocumentFiles | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
