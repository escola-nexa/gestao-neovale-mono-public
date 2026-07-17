import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorDocumentFiles } from '../entities/professor_document_files.entity';
import { UpdateProfessorDocumentFilesDto } from '../dto/update-professor_document_files.dto';

@Injectable()
export class UpdateProfessorDocumentFilesService {
  constructor(
    @InjectRepository(ProfessorDocumentFiles)
    private readonly repository: Repository<ProfessorDocumentFiles>,
  ) {}

  async execute(id: string, dto: UpdateProfessorDocumentFilesDto, organizationId: string): Promise<ProfessorDocumentFiles> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
