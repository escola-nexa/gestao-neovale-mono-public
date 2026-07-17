import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorDocuments } from '../entities/professor_documents.entity';
import { CreateProfessorDocumentsDto } from '../dto/create-professor_documents.dto';

@Injectable()
export class CreateProfessorDocumentsService {
  constructor(
    @InjectRepository(ProfessorDocuments)
    private readonly repository: Repository<ProfessorDocuments>,
  ) {}

  async execute(dto: CreateProfessorDocumentsDto, organizationId: string): Promise<ProfessorDocuments> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
