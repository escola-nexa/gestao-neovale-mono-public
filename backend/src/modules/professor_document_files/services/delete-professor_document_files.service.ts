import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorDocumentFiles } from '../entities/professor_document_files.entity';

@Injectable()
export class DeleteProfessorDocumentFilesService {
  constructor(
    @InjectRepository(ProfessorDocumentFiles)
    private readonly repository: Repository<ProfessorDocumentFiles>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
