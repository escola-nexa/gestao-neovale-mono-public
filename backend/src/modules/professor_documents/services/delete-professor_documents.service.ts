import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorDocuments } from '../entities/professor_documents.entity';

@Injectable()
export class DeleteProfessorDocumentsService {
  constructor(
    @InjectRepository(ProfessorDocuments)
    private readonly repository: Repository<ProfessorDocuments>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
