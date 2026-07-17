import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorDocumentFiles } from '../entities/professor_document_files.entity';
import { CreateProfessorDocumentFilesDto } from '../dto/create-professor_document_files.dto';

@Injectable()
export class CreateProfessorDocumentFilesService {
  constructor(
    @InjectRepository(ProfessorDocumentFiles)
    private readonly repository: Repository<ProfessorDocumentFiles>,
  ) {}

  async execute(dto: CreateProfessorDocumentFilesDto, organizationId: string): Promise<ProfessorDocumentFiles> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
